import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import { colors } from '../theme/colors';
import { transfersApi } from '../api/transfers';
import { folderPackager, type FolderUploadProgress } from '../services/folderPackager';
import type { PickedFile } from '../types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ProgressBar } from '../components/ProgressBar';
import { ShareModal } from '../components/ShareModal';
import { formatBytes, getFileIcon } from '../utils/formatters';

interface UploadScreenProps {
  initialMode?: 'file' | 'folder';
  onUploadSuccess: () => void;
  onCancel: () => void;
}

export const UploadScreen: React.FC<UploadScreenProps> = ({
  initialMode = 'file',
  onUploadSuccess,
  onCancel,
}) => {
  const [mode, setMode] = useState<'file' | 'folder'>(initialMode);

  // Single file state
  const [singleFile, setSingleFile] = useState<PickedFile | null>(null);

  // Folder / multi-file state
  const [folderFiles, setFolderFiles] = useState<PickedFile[]>([]);
  const [folderName, setFolderName] = useState('shared_folder');

  // Password protection state
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState('');

  // Upload progress state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [loadedBytes, setLoadedBytes] = useState<number | undefined>(undefined);
  const [totalBytes, setTotalBytes] = useState<number | undefined>(undefined);
  const [statusMessage, setStatusMessage] = useState('');

  // Completed modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [completedShareUrl, setCompletedShareUrl] = useState('');
  const [completedFilename, setCompletedFilename] = useState('');

  // ─────────────────────────────────────────────────────────────────────────
  // Pick Single File
  // ─────────────────────────────────────────────────────────────────────────
  const handlePickSingleFile = async () => {
    try {
      const res = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.allFiles],
        copyTo: 'cachesDirectory',
      });

      setSingleFile({
        uri: res.fileCopyUri || res.uri,
        name: res.name || 'unnamed_file',
        size: res.size || 0,
        type: res.type || 'application/octet-stream',
      });
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        Alert.alert('Error', 'Failed to pick file.');
      }
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Pick Multiple Files / Folder
  // ─────────────────────────────────────────────────────────────────────────
  const handlePickFolderFiles = async () => {
    try {
      const res = await DocumentPicker.pick({
        allowMultiSelection: true,
        type: [DocumentPicker.types.allFiles],
        copyTo: 'cachesDirectory',
      });

      const picked: PickedFile[] = res.map((r) => ({
        uri: r.fileCopyUri || r.uri,
        name: r.name || 'file',
        size: r.size || 0,
        type: r.type || 'application/octet-stream',
      }));

      setFolderFiles(picked);
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        Alert.alert('Error', 'Failed to pick files.');
      }
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Execute Upload
  // ─────────────────────────────────────────────────────────────────────────
  const handleStartUpload = async () => {
    if (enablePassword && !password.trim()) {
      Alert.alert('Password Required', 'Please enter a password or disable password protection.');
      return;
    }

    setIsUploading(true);
    setUploadPercent(0);
    setLoadedBytes(undefined);
    setTotalBytes(undefined);

    try {
      if (mode === 'file') {
        if (!singleFile) {
          Alert.alert('No file', 'Please select a file to upload.');
          setIsUploading(false);
          return;
        }

        setStatusMessage('Creating transfer and obtaining R2 pre-signed URL...');
        const result = await transfersApi.fullUpload(
          singleFile,
          { password: enablePassword ? password.trim() : undefined },
          (pct, loaded, total) => {
            setStatusMessage(`Uploading to Cloudflare R2... ${pct}%`);
            setUploadPercent(pct);
            setLoadedBytes(loaded);
            setTotalBytes(total);
          }
        );

        setCompletedShareUrl(result.shareUrl);
        setCompletedFilename(singleFile.name);
        setModalVisible(true);
      } else {
        if (folderFiles.length === 0) {
          Alert.alert('No files', 'Please select one or more files for the folder archive.');
          setIsUploading(false);
          return;
        }

        const result = await folderPackager.packageAndUploadFolder(
          folderFiles,
          folderName || 'shared_folder',
          { password: enablePassword ? password.trim() : undefined },
          (p: FolderUploadProgress) => {
            setUploadPercent(p.percent);
            setLoadedBytes(p.loadedBytes);
            setTotalBytes(p.totalBytes);

            switch (p.stage) {
              case 'reading':
                setStatusMessage(`Packaging files: ${p.currentFileName || ''}`);
                break;
              case 'zipping':
                setStatusMessage('Compressing into ZIP archive...');
                break;
              case 'uploading':
                setStatusMessage('Uploading ZIP package to Cloudflare R2...');
                break;
              case 'completing':
                setStatusMessage('Validating and finalizing transfer...');
                break;
            }
          }
        );

        const finalName = folderName.endsWith('.zip') ? folderName : `${folderName}.zip`;
        setCompletedShareUrl(result.shareUrl);
        setCompletedFilename(finalName);
        setModalVisible(true);
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.message ||
        'Upload failed. Please check your network and server quota.';
      Alert.alert('Upload Error', msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleModalClose = () => {
    setModalVisible(false);
    onUploadSuccess();
  };

  const totalFolderSize = folderFiles.reduce((acc, f) => acc + f.size, 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Mode Switcher */}
      <View style={styles.modeTabs}>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'file' && styles.activeModeTab]}
          onPress={() => {
            if (!isUploading) setMode('file');
          }}
          disabled={isUploading}
        >
          <Text style={[styles.modeTabText, mode === 'file' && styles.activeModeTabText]}>
            📄 Single File
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeTab, mode === 'folder' && styles.activeModeTab]}
          onPress={() => {
            if (!isUploading) setMode('folder');
          }}
          disabled={isUploading}
        >
          <Text style={[styles.modeTabText, mode === 'folder' && styles.activeModeTabText]}>
            📁 Folder (ZIP)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Upload Zone */}
      {mode === 'file' ? (
        <Card variant="elevated" style={styles.uploadCard}>
          <Text style={styles.sectionTitle}>Select File to Share</Text>

          {singleFile ? (
            <View style={styles.selectedFileBox}>
              <View style={styles.selectedIconWrapper}>
                <Text style={styles.selectedIcon}>
                  {getFileIcon(singleFile.name, singleFile.type)}
                </Text>
              </View>
              <View style={styles.selectedMeta}>
                <Text style={styles.selectedName} numberOfLines={1}>
                  {singleFile.name}
                </Text>
                <Text style={styles.selectedSize}>{formatBytes(singleFile.size)}</Text>
              </View>
              {!isUploading && (
                <TouchableOpacity
                  onPress={() => setSingleFile(null)}
                  style={styles.clearBtn}
                >
                  <Text style={styles.clearText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.dropZone}
              onPress={handlePickSingleFile}
              disabled={isUploading}
              activeOpacity={0.8}
            >
              <Text style={styles.dropIcon}>📤</Text>
              <Text style={styles.dropTitle}>Tap to Browse File</Text>
              <Text style={styles.dropSubtitle}>
                Supports documents, photos, audio, videos, archives
              </Text>
            </TouchableOpacity>
          )}

          {singleFile && !isUploading && (
            <Button
              title="Choose Different File"
              variant="secondary"
              size="sm"
              onPress={handlePickSingleFile}
              style={{ marginTop: 10 }}
            />
          )}
        </Card>
      ) : (
        <Card variant="elevated" style={styles.uploadCard}>
          <Text style={styles.sectionTitle}>Share Folder or Multiple Files</Text>
          <Text style={styles.folderDesc}>
            Selected files are automatically packaged into a structured ZIP archive for easy one-link sharing.
          </Text>

          <Input
            label="Folder / Archive Name"
            placeholder="e.g. project_assets"
            value={folderName}
            onChangeText={setFolderName}
            editable={!isUploading}
          />

          <TouchableOpacity
            style={styles.dropZone}
            onPress={handlePickFolderFiles}
            disabled={isUploading}
            activeOpacity={0.8}
          >
            <Text style={styles.dropIcon}>📁</Text>
            <Text style={styles.dropTitle}>
              {folderFiles.length > 0
                ? `${folderFiles.length} Files Selected (${formatBytes(totalFolderSize)})`
                : 'Tap to Select Files / Folder'}
            </Text>
            <Text style={styles.dropSubtitle}>
              Select multiple files to compress and share together
            </Text>
          </TouchableOpacity>

          {/* List of picked files */}
          {folderFiles.length > 0 && (
            <View style={styles.folderFilesList}>
              <Text style={styles.filesListHeader}>Files in Package:</Text>
              {folderFiles.slice(0, 5).map((f, i) => (
                <View key={i} style={styles.folderFileItem}>
                  <Text style={styles.folderFileIcon}>
                    {getFileIcon(f.name, f.type)}
                  </Text>
                  <Text style={styles.folderFileName} numberOfLines={1}>
                    {f.name}
                  </Text>
                  <Text style={styles.folderFileSize}>{formatBytes(f.size)}</Text>
                </View>
              ))}
              {folderFiles.length > 5 && (
                <Text style={styles.moreFilesText}>
                  + {folderFiles.length - 5} more files included
                </Text>
              )}
            </View>
          )}
        </Card>
      )}

      {/* Password Protection Card */}
      <Card style={styles.optionsCard}>
        <View style={styles.optionHeader}>
          <View>
            <Text style={styles.optionTitle}>Password Protection</Text>
            <Text style={styles.optionSubtitle}>
              Require a password before recipient can claim the file
            </Text>
          </View>
          <Switch
            value={enablePassword}
            onValueChange={setEnablePassword}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#ffffff"
            disabled={isUploading}
          />
        </View>

        {enablePassword && (
          <Input
            label="Set Secret Password"
            placeholder="Enter unlock password"
            value={password}
            onChangeText={setPassword}
            isPassword
            editable={!isUploading}
          />
        )}
      </Card>

      {/* Progress Card when Uploading */}
      {isUploading && (
        <Card variant="elevated" style={styles.progressCard}>
          <Text style={styles.progressStatus}>{statusMessage}</Text>
          <ProgressBar
            percent={uploadPercent}
            loadedBytes={loadedBytes}
            totalBytes={totalBytes}
            color={colors.primary}
          />
        </Card>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtonsRow}>
        <Button
          title={isUploading ? 'Uploading...' : 'Upload & Generate Link ⚡'}
          onPress={handleStartUpload}
          loading={isUploading}
          disabled={isUploading || (mode === 'file' ? !singleFile : folderFiles.length === 0)}
          style={styles.uploadBtn}
        />
        {!isUploading && (
          <Button
            title="Cancel"
            variant="ghost"
            onPress={onCancel}
            style={styles.cancelBtn}
          />
        )}
      </View>

      {/* Share Modal on Completion */}
      <ShareModal
        visible={modalVisible}
        onClose={handleModalClose}
        shareUrl={completedShareUrl}
        filename={completedFilename}
        hasPassword={enablePassword}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 40,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  activeModeTab: {
    backgroundColor: colors.primary,
  },
  modeTabText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  activeModeTabText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  uploadCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  folderDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 16,
  },
  dropZone: {
    borderWidth: 2,
    borderColor: colors.borderLight,
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.03)',
    marginTop: 8,
  },
  dropIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  dropTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  dropSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  selectedFileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 12,
    marginTop: 8,
  },
  selectedIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  selectedIcon: {
    fontSize: 20,
  },
  selectedMeta: {
    flex: 1,
  },
  selectedName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  selectedSize: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  clearBtn: {
    padding: 8,
  },
  clearText: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '700',
  },
  folderFilesList: {
    marginTop: 14,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    padding: 12,
  },
  filesListHeader: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  folderFileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  folderFileIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  folderFileName: {
    color: colors.text,
    fontSize: 13,
    flex: 1,
  },
  folderFileSize: {
    color: colors.textMuted,
    fontSize: 11,
    marginLeft: 8,
  },
  moreFilesText: {
    color: colors.primary,
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
  },
  optionsCard: {
    marginBottom: 16,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  optionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    maxWidth: 240,
  },
  progressCard: {
    marginBottom: 16,
    borderColor: colors.primary,
  },
  progressStatus: {
    color: colors.secondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  actionButtonsRow: {
    marginTop: 8,
  },
  uploadBtn: {
    marginBottom: 10,
  },
  cancelBtn: {
    alignSelf: 'center',
  },
});
