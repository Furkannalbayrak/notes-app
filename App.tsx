import React, { useEffect } from 'react';
import { Appearance, Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import * as NavigationBar from 'expo-navigation-bar';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useStore } from './src/store/useStore';
import { getTheme } from './src/theme';
import { RootStackParamList } from './src/types';
import HomeScreen from './src/screens/HomeScreen';
import EditorScreen from './src/screens/EditorScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import FoldersScreen from './src/screens/FoldersScreen';

SplashScreen.preventAutoHideAsync().catch(() => {});
SystemUI.setBackgroundColorAsync('#000000').catch(() => {});

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_600SemiBold, Inter_700Bold });
  const hydrated = useStore((s) => s.hydrated);
  const mode = useStore((s) => s.theme);
  const theme = getTheme(mode);
  const ready = fontsLoaded && hydrated;

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.background).catch(() => {});
    if (Platform.OS === 'android') {
      Appearance.setColorScheme(mode);
      NavigationBar.setStyle(mode === 'dark' ? 'dark' : 'light');
    }
  }, [mode, theme.background]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  const navTheme = {
    ...DefaultTheme,
    dark: mode === 'dark',
    colors: {
      ...DefaultTheme.colors,
      background: theme.background,
      card: theme.background,
      text: theme.text,
      border: theme.border,
      primary: theme.accent,
    },
  };

  return (
    <GestureHandlerRootView style={[styles.flex, { backgroundColor: theme.background }]}>
      <SafeAreaProvider style={{ backgroundColor: theme.background }}>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <NavigationContainer theme={navTheme}>
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.background },
              animation: 'fade',
              navigationBarColor: theme.background,
              statusBarBackgroundColor: theme.background,
              statusBarStyle: mode === 'dark' ? 'light' : 'dark',
            }}
          >
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen
              name="Editor"
              component={EditorScreen}
              options={{
                animation: 'none',
                presentation: 'transparentModal',
                contentStyle: { backgroundColor: 'transparent' },
              }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{
                animation: 'none',
                presentation: 'transparentModal',
                contentStyle: { backgroundColor: 'transparent' },
              }}
            />
            <Stack.Screen
              name="Folders"
              component={FoldersScreen}
              options={{
                animation: 'none',
                presentation: 'transparentModal',
                contentStyle: { backgroundColor: 'transparent' },
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
