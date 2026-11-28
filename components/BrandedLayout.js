import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BrandedHeader from './BrandedHeader';
import { colors } from '../constants/theme';

export default function BrandedLayout({ children, showSignOut = false }) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar translucent={false} backgroundColor={colors.surface} barStyle="dark-content" />
      <BrandedHeader showSignOut={showSignOut} />
      <View style={styles.content}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
