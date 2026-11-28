import { Feather } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { borderRadius, colors, shadows } from '../constants/theme';

export default function AppUpdateModal({
  visible,
  updateInfo,
  updating = false,
  onConfirm,
  onCancel,
}) {
  if (!updateInfo) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!updating && onCancel) onCancel();
      }}
    >
      <TouchableWithoutFeedback
        onPress={() => {
          if (!updating && onCancel) onCancel();
        }}
      >
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                  <View style={styles.iconCircle}>
                    <Feather name="download-cloud" size={20} color="#0284C7" />
                  </View>
                  <View style={styles.titleBlock}>
                    <Text style={styles.modalTitle}>New Update Available</Text>
                    <Text style={styles.modalSubtitle}>Cellventory {updateInfo.versionLabel}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={onCancel}
                  disabled={updating}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Close update prompt"
                >
                  <Feather name="x" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.detailsCard}>
                <View style={styles.detailRow}>
                  <Feather name="clock" size={15} color={colors.primary} style={styles.detailIcon} />
                  <View style={styles.detailTextCol}>
                    <Text style={styles.detailLabel}>Update Date & Time</Text>
                    <Text style={styles.detailValue}>
                      {updateInfo.formattedDateTime || 'Available now'}
                    </Text>
                  </View>
                </View>

                {(updateInfo.channel || updateInfo.updateIdShort) && (
                  <View style={styles.metaChipsRow}>
                    {updateInfo.channel ? (
                      <View style={styles.metaChip}>
                        <Text style={styles.metaChipText}>Channel: {updateInfo.channel}</Text>
                      </View>
                    ) : null}
                    {updateInfo.updateIdShort ? (
                      <View style={styles.metaChip}>
                        <Text style={styles.metaChipText}>ID: {updateInfo.updateIdShort}</Text>
                      </View>
                    ) : null}
                  </View>
                )}
              </View>

              <Text style={styles.confirmCopy}>
                Would you like to download and install this update now? The app will restart automatically once ready.
              </Text>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.laterBtn, updating && styles.btnDisabled]}
                  onPress={onCancel}
                  disabled={updating}
                  activeOpacity={0.8}
                >
                  <Text style={styles.laterBtnText}>Later</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.updateBtn, updating && styles.btnDisabled]}
                  onPress={onConfirm}
                  disabled={updating}
                  activeOpacity={0.8}
                >
                  {updating ? (
                    <>
                      <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.updateBtnText}>Updating...</Text>
                    </>
                  ) : (
                    <>
                      <Feather name="download" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.updateBtnText}>Update Now</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.floating,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  titleBlock: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primary,
  },
  modalSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  detailsCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: 12,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    marginRight: 10,
  },
  detailTextCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  metaChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  metaChip: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  confirmCopy: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    marginBottom: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  laterBtn: {
    flex: 1,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  updateBtn: {
    flex: 1.4,
    height: 44,
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  updateBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.65,
  },
});
