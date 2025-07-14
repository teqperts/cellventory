import { StyleSheet, Text, View } from 'react-native';

export default function FormSection({ title, children, description }) {
  return (
    <View style={styles.section}>
      {title && <Text style={styles.title}>{title}</Text>}
      {description && <Text style={styles.description}>{description}</Text>}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 30,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#305F72',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#687E91',
    marginBottom: 10,
  },
  content: {
    marginTop: 0,
  },
});
