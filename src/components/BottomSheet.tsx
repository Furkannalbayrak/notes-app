import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  theme: Theme;
  children: React.ReactNode;
}

export function BottomSheet({ visible, onClose, theme, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={[styles.backdrop, { backgroundColor: theme.overlay }]} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: theme.surface, paddingBottom: 12 },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.checkEmpty }]} />
          {children}
        </View>
        {insets.bottom > 0 && (
          <View style={{ height: insets.bottom, backgroundColor: theme.navBar }} />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 8,
    maxHeight: '75%',
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginBottom: 10 },
});
