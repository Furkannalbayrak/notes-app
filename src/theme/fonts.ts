import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_700Bold,
} from '@expo-google-fonts/roboto';
import {
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';
import {
  Lora_400Regular,
  Lora_600SemiBold,
  Lora_700Bold,
} from '@expo-google-fonts/lora';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import {
  Caveat_400Regular,
  Caveat_600SemiBold,
  Caveat_700Bold,
} from '@expo-google-fonts/caveat';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_600SemiBold,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { AppFontFamily } from '../types';

export interface FontConfig {
  id: AppFontFamily;
  label: string;
  regular: string;
  semiBold: string;
  bold: string;
}

export const FONT_CONFIGS: Record<AppFontFamily, FontConfig> = {
  inter: {
    id: 'inter',
    label: 'Inter (Varsayılan)',
    regular: 'Inter_400Regular',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
  roboto: {
    id: 'roboto',
    label: 'Roboto',
    regular: 'Roboto_400Regular',
    semiBold: 'Roboto_500Medium',
    bold: 'Roboto_700Bold',
  },
  poppins: {
    id: 'poppins',
    label: 'Poppins',
    regular: 'Poppins_400Regular',
    semiBold: 'Poppins_600SemiBold',
    bold: 'Poppins_700Bold',
  },
  nunito: {
    id: 'nunito',
    label: 'Nunito',
    regular: 'Nunito_400Regular',
    semiBold: 'Nunito_600SemiBold',
    bold: 'Nunito_700Bold',
  },
  lora: {
    id: 'lora',
    label: 'Lora (Kitap)',
    regular: 'Lora_400Regular',
    semiBold: 'Lora_600SemiBold',
    bold: 'Lora_700Bold',
  },
  playfair: {
    id: 'playfair',
    label: 'Playfair Display',
    regular: 'PlayfairDisplay_400Regular',
    semiBold: 'PlayfairDisplay_600SemiBold',
    bold: 'PlayfairDisplay_700Bold',
  },
  caveat: {
    id: 'caveat',
    label: 'Caveat (El Yazısı)',
    regular: 'Caveat_400Regular',
    semiBold: 'Caveat_600SemiBold',
    bold: 'Caveat_700Bold',
  },
  jetbrains: {
    id: 'jetbrains',
    label: 'JetBrains (Daktilo)',
    regular: 'JetBrainsMono_400Regular',
    semiBold: 'JetBrainsMono_600SemiBold',
    bold: 'JetBrainsMono_700Bold',
  },
};

export const ALL_APP_FONTS = {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_700Bold,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Lora_400Regular,
  Lora_600SemiBold,
  Lora_700Bold,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  Caveat_400Regular,
  Caveat_600SemiBold,
  Caveat_700Bold,
  JetBrainsMono_400Regular,
  JetBrainsMono_600SemiBold,
  JetBrainsMono_700Bold,
};
