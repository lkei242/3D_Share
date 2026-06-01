module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'react-native-iconify/babel',
      {
        icons: [
          // Iconos de la Tab Bar inferior
          'lucide:home',
          'solar:chat-line-outline',
          'material-symbols:search-rounded',
          'octicon:person-24',
          
          // Iconos de la cabecera y tarjetas
          'mdi:plus-circle-outline',
          'mdi:bookmark-outline',
          'mdi:chart-bar',
        ],
        entry: 'App.tsx', // Mantiene la entrada de TypeScript configurada
      },
    ],
  ],
};