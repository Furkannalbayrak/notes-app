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
  Montserrat_400Regular,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from '@expo-google-fonts/montserrat';
import {
  OpenSans_400Regular,
  OpenSans_600SemiBold,
  OpenSans_700Bold,
} from '@expo-google-fonts/open-sans';
import {
  Quicksand_400Regular,
  Quicksand_600SemiBold,
  Quicksand_700Bold,
} from '@expo-google-fonts/quicksand';
import {
  Raleway_400Regular,
  Raleway_600SemiBold,
  Raleway_700Bold,
} from '@expo-google-fonts/raleway';
import {
  Comfortaa_400Regular,
  Comfortaa_600SemiBold,
  Comfortaa_700Bold,
} from '@expo-google-fonts/comfortaa';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  Oswald_400Regular,
  Oswald_600SemiBold,
  Oswald_700Bold,
} from '@expo-google-fonts/oswald';
import {
  Lora_400Regular,
  Lora_600SemiBold,
  Lora_700Bold,
} from '@expo-google-fonts/lora';
import {
  Merriweather_400Regular,
  Merriweather_600SemiBold,
  Merriweather_700Bold,
} from '@expo-google-fonts/merriweather';
import {
  CrimsonPro_400Regular,
  CrimsonPro_600SemiBold,
  CrimsonPro_700Bold,
} from '@expo-google-fonts/crimson-pro';
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
  DancingScript_400Regular,
  DancingScript_600SemiBold,
  DancingScript_700Bold,
} from '@expo-google-fonts/dancing-script';
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
  montserrat: {
    id: 'montserrat',
    label: 'Montserrat',
    regular: 'Montserrat_400Regular',
    semiBold: 'Montserrat_600SemiBold',
    bold: 'Montserrat_700Bold',
  },
  opensans: {
    id: 'opensans',
    label: 'Open Sans',
    regular: 'OpenSans_400Regular',
    semiBold: 'OpenSans_600SemiBold',
    bold: 'OpenSans_700Bold',
  },
  quicksand: {
    id: 'quicksand',
    label: 'Quicksand (Yumuşak)',
    regular: 'Quicksand_400Regular',
    semiBold: 'Quicksand_600SemiBold',
    bold: 'Quicksand_700Bold',
  },
  raleway: {
    id: 'raleway',
    label: 'Raleway (Zarif)',
    regular: 'Raleway_400Regular',
    semiBold: 'Raleway_600SemiBold',
    bold: 'Raleway_700Bold',
  },
  comfortaa: {
    id: 'comfortaa',
    label: 'Comfortaa (Yuvarlak)',
    regular: 'Comfortaa_400Regular',
    semiBold: 'Comfortaa_600SemiBold',
    bold: 'Comfortaa_700Bold',
  },
  spacegrotesk: {
    id: 'spacegrotesk',
    label: 'Space Grotesk (Modern)',
    regular: 'SpaceGrotesk_400Regular',
    semiBold: 'SpaceGrotesk_600SemiBold',
    bold: 'SpaceGrotesk_700Bold',
  },
  oswald: {
    id: 'oswald',
    label: 'Oswald (Manşet)',
    regular: 'Oswald_400Regular',
    semiBold: 'Oswald_600SemiBold',
    bold: 'Oswald_700Bold',
  },
  lora: {
    id: 'lora',
    label: 'Lora (Kitap)',
    regular: 'Lora_400Regular',
    semiBold: 'Lora_600SemiBold',
    bold: 'Lora_700Bold',
  },
  merriweather: {
    id: 'merriweather',
    label: 'Merriweather (Roman)',
    regular: 'Merriweather_400Regular',
    semiBold: 'Merriweather_600SemiBold',
    bold: 'Merriweather_700Bold',
  },
  crimsonpro: {
    id: 'crimsonpro',
    label: 'Crimson Pro (Edebiyat)',
    regular: 'CrimsonPro_400Regular',
    semiBold: 'CrimsonPro_600SemiBold',
    bold: 'CrimsonPro_700Bold',
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
  dancingscript: {
    id: 'dancingscript',
    label: 'Dancing Script (Kaligrafi)',
    regular: 'DancingScript_400Regular',
    semiBold: 'DancingScript_600SemiBold',
    bold: 'DancingScript_700Bold',
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
  Montserrat_400Regular,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  OpenSans_400Regular,
  OpenSans_600SemiBold,
  OpenSans_700Bold,
  Quicksand_400Regular,
  Quicksand_600SemiBold,
  Quicksand_700Bold,
  Raleway_400Regular,
  Raleway_600SemiBold,
  Raleway_700Bold,
  Comfortaa_400Regular,
  Comfortaa_600SemiBold,
  Comfortaa_700Bold,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
  Oswald_400Regular,
  Oswald_600SemiBold,
  Oswald_700Bold,
  Lora_400Regular,
  Lora_600SemiBold,
  Lora_700Bold,
  Merriweather_400Regular,
  Merriweather_600SemiBold,
  Merriweather_700Bold,
  CrimsonPro_400Regular,
  CrimsonPro_600SemiBold,
  CrimsonPro_700Bold,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  Caveat_400Regular,
  Caveat_600SemiBold,
  Caveat_700Bold,
  DancingScript_400Regular,
  DancingScript_600SemiBold,
  DancingScript_700Bold,
  JetBrainsMono_400Regular,
  JetBrainsMono_600SemiBold,
  JetBrainsMono_700Bold,
};
