import type { MantineThemeOverride } from '@mantine/core'
import { globalDefaultTheme } from './global-default'

export type ThemeName = 'global-default' | 'gov-formal' | 'think-tank-modern' | 'academic-warm'

export const themes: Record<ThemeName, MantineThemeOverride> = {
  'global-default': globalDefaultTheme,

  'gov-formal': {
    ...globalDefaultTheme,
    primaryColor: 'sims-navy',
    colors: {
      ...globalDefaultTheme.colors,
      'sims-navy': [
        '#E6EDF5', '#C0D2E8', '#94B3D8', '#6794C8', '#3F76B8',
        '#1A5AA6', '#004488', '#003366', '#002550', '#001838',
      ],
    },
  },

  'think-tank-modern': {
    ...globalDefaultTheme,
    primaryColor: 'sims-indigo',
    colors: {
      ...globalDefaultTheme.colors,
      'sims-indigo': [
        '#EEF2FF', '#E0E7FF', '#C7D2FE', '#A5B4FC', '#818CF8',
        '#6366F1', '#4F46E5', '#4338CA', '#3730A3', '#312E81',
      ],
    },
  },

  'academic-warm': {
    ...globalDefaultTheme,
    primaryColor: 'sims-maroon',
    colors: {
      ...globalDefaultTheme.colors,
      'sims-maroon': [
        '#FFF1EE', '#FFD5C8', '#FFB09A', '#F4846A', '#E55E43',
        '#CF3D24', '#B02010', '#7C2D12', '#5C1E0A', '#3C1005',
      ],
    },
  },
}
