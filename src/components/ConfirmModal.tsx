import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../theme';

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface AlertState {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AlertButton[];
}

type Listener = (state: AlertState) => void;

let currentListener: Listener | null = null;

/**
 * Uygulamanın aktif temasına (Dark / Light mode ve seçili yazı tipi)
 * uyum sağlayan özel onay / uyarı kutusu tetikleyicisi.
 */
export function showAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
) {
  const resolvedButtons: AlertButton[] =
    buttons && buttons.length > 0 ? buttons : [{ text: 'Tamam', style: 'default' }];

  currentListener?.({
    visible: true,
    title,
    message,
    buttons: resolvedButtons,
  });
}

export function ConfirmModalHost() {
  const theme = useTheme();
  const [state, setState] = useState<AlertState>({
    visible: false,
    title: '',
    message: undefined,
    buttons: [],
  });

  useEffect(() => {
    currentListener = setState;
    return () => {
      if (currentListener === setState) {
        currentListener = null;
      }
    };
  }, []);

  const close = () => {
    setState((prev) => ({ ...prev, visible: false }));
  };

  const handleBackdropCancel = () => {
    const cancelBtn = state.buttons.find((b) => b.style === 'cancel');
    close();
    cancelBtn?.onPress?.();
  };

  const handlePressButton = (btn: AlertButton) => {
    close();
    btn.onPress?.();
  };

  return (
    <Modal
      visible={state.visible}
      transparent
      animationType="fade"
      onRequestClose={handleBackdropCancel}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.modalWrap}>
        <Pressable
          style={[styles.backdrop, { backgroundColor: theme.overlay }]}
          onPress={handleBackdropCancel}
        />
        <View
          style={[
            styles.dialog,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <Text
            style={[
              styles.title,
              {
                color: theme.text,
                fontFamily: theme.fonts.bold,
              },
            ]}
          >
            {state.title}
          </Text>

          {state.message ? (
            <Text
              style={[
                styles.message,
                {
                  color: theme.textSecondary,
                  fontFamily: theme.fonts.regular,
                },
              ]}
            >
              {state.message}
            </Text>
          ) : null}

          <View style={styles.actions}>
            {state.buttons.map((btn, idx) => {
              const isDestructive = btn.style === 'destructive';
              const isCancel = btn.style === 'cancel';

              const bgColor = isDestructive
                ? theme.danger
                : isCancel
                  ? theme.mode === 'dark'
                    ? '#2C2C2E'
                    : theme.pill
                  : theme.accent;

              const textColor = isDestructive
                ? '#FFFFFF'
                : isCancel
                  ? theme.text
                  : '#FFFFFF';

              return (
                <TouchableOpacity
                  key={`${btn.text}-${idx}`}
                  activeOpacity={0.78}
                  onPress={() => handlePressButton(btn)}
                  style={[styles.btn, { backgroundColor: bgColor }]}
                >
                  <Text
                    style={[
                      styles.btnText,
                      {
                        color: textColor,
                        fontFamily: theme.fonts.semiBold,
                      },
                    ]}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  title: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14.5,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  btnText: {
    fontSize: 15,
  },
});
