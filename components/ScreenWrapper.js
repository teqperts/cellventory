import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ScreenWrapper({ children, scroll = false }) {
  const Container = scroll ? ScrollView : View;

  return (
    <SafeAreaView style={styles.safe}>
      <Container contentContainerStyle={styles.container}>
        {children}
      </Container>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F6F9FF',
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
  },
});
