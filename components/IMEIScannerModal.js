// components/IMEIScannerModal.js
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, typography } from '../constants/theme';
import { extractIMEIFromBarcode, validateIMEI, formatIMEI } from '../utils/imei';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SCAN_BOX_SIZE = Math.min(SCREEN_WIDTH * 0.8, 300);

export default function IMEIScannerModal({ visible, onClose, onScan }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);

  // Reset scan state and torch whenever modal opens
  useEffect(() => {
    if (visible) {
      setScanned(false);
      setTorch(false);
    }
  }, [visible]);

  const handleBarcodeScanned = ({ data, type }) => {
    if (scanned) return;
    setScanned(true);

    const extracted = extractIMEIFromBarcode(data);
    const validation = validateIMEI(extracted);

    if (validation.valid) {
      // Valid 15-digit Luhn IMEI
      onScan(extracted);
      onClose();
    } else {
      // Barcode scanned but Luhn check or length failed
      Alert.alert(
        'IMEI Scanned',
        `Scanned value: ${extracted || data}\n\n${
          validation.reason || 'Not a valid 15-digit IMEI.'
        }\n\nWould you like to use this value or scan again?`,
        [
          {
            text: 'Scan Again',
            style: 'cancel',
            onPress: () => setScanned(false),
          },
          {
            text: 'Use Anyway',
            onPress: () => {
              onScan(extracted || data);
              onClose();
            },
          },
        ]
      );
    }
  };

  const handleClose = () => {
    setScanned(false);
    setTorch(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Permission Checking */}
        {!permission ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.loadingText}>Initializing camera...</Text>
          </View>
        ) : !permission.granted ? (
          <View style={styles.permissionContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="camera-outline" size={48} color={colors.accent} />
            </View>
            <Text style={styles.permissionTitle}>Camera Access Needed</Text>
            <Text style={styles.permissionSubtitle}>
              Cellventory uses the camera to scan IMEI barcodes on device screens (dial *#06#), SIM trays, or device boxes.
            </Text>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={requestPermission}
              activeOpacity={0.8}
            >
              <Text style={styles.permissionButtonText}>Grant Camera Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>Cancel & Enter Manually</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={StyleSheet.absoluteFill}>
            {/* Live Camera View */}
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              enableTorch={torch}
              barcodeScannerSettings={{
                barcodeTypes: [
                  'qr',
                  'code128',
                  'code39',
                  'ean13',
                  'ean8',
                  'upc_a',
                  'upc_e',
                  'pdf417',
                  'aztec',
                  'datamatrix',
                ],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />

            {/* Viewfinder Overlay Mask */}
            <View style={styles.overlayContainer}>
              {/* Top Bar Controls */}
              <View style={styles.topBar}>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={handleClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={26} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={styles.titleContainer}>
                  <Text style={styles.topBarTitle}>Scan IMEI</Text>
                  <Text style={styles.topBarSubtitle}>Dial *#06# on phone</Text>
                </View>

                <TouchableOpacity
                  style={[styles.iconButton, torch && styles.iconButtonActive]}
                  onPress={() => setTorch(!torch)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={torch ? 'flash' : 'flash-outline'}
                    size={22}
                    color={torch ? '#F59E0B' : '#FFFFFF'}
                  />
                </TouchableOpacity>
              </View>

              {/* Viewfinder Target Window */}
              <View style={styles.viewfinderCenter}>
                <View style={styles.scanTargetBox}>
                  {/* Corner Reticles */}
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />

                  {/* Red/Green Aim Indicator */}
                  <View style={styles.aimLine} />
                </View>
              </View>

              {/* Bottom Instructions Card */}
              <View style={styles.bottomCard}>
                <View style={styles.tipRow}>
                  <Ionicons name="keypad-outline" size={20} color={colors.accent} />
                  <Text style={styles.tipText}>
                    <Text style={styles.boldText}>Tip:</Text> Dial <Text style={styles.codeText}>*#06#</Text> on the customer's phone to display the IMEI barcode instantly on screen.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.manualEntryBtn}
                  onPress={handleClose}
                  activeOpacity={0.8}
                >
                  <Text style={styles.manualEntryText}>Enter IMEI Manually</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 12,
    fontSize: 15,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
    backgroundColor: colors.surface,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: borderRadius.md,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  overlayContainer: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  topBar: {
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  titleContainer: {
    alignItems: 'center',
  },
  topBarTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  topBarSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.3)',
  },
  viewfinderCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanTargetBox: {
    width: SCAN_BOX_SIZE,
    height: SCAN_BOX_SIZE * 0.55,
    backgroundColor: 'transparent',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#38BDF8', // Cyan glowing border
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 6,
  },
  aimLine: {
    width: '90%',
    height: 2,
    backgroundColor: '#EF4444', // Scanner laser guide
    opacity: 0.85,
  },
  bottomCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    marginHorizontal: 16,
    marginBottom: Platform.OS === 'ios' ? 40 : 24,
    borderRadius: borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  tipText: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 10,
    flex: 1,
  },
  boldText: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  codeText: {
    fontWeight: '700',
    color: '#38BDF8',
  },
  manualEntryBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  manualEntryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
