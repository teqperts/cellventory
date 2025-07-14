import { Image, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BrandedLayout({ children, scroll = false }) {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <StatusBar translucent={false} backgroundColor="#FFFFFF" barStyle="dark-content" />
        {/* Fixed Header */}
        <View style={styles.header}>
          <Image
            source={require('../assets/header-icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Content */}
        <View style={scroll ? styles.scrollLike : styles.content}>
          {children}
        </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F9FF',
  },
  container: {
    flex: 1,
  },
  header: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#CCD4E3',
  },
  logo: {
    height: 75,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  scrollLike: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
});
