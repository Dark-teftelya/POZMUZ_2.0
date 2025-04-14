const path = require('path');

module.exports = {
  entry: './src/index.js', // Укажите точку входа
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.worker\.js$/,  // Обрабатываем все worker файлы
        use: { 
          loader: 'worker-loader', 
          options: { inline: 'fallback' } 
        }
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              '@babel/preset-react'
            ]
          }
        }
      },
      {
        test: /\.css$/,  // Добавляем обработку CSS файлов
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(gif|png|jpg|jpeg|svg)$/,  // Обрабатываем изображения (например, gif)
        use: ['file-loader'],
      },
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  mode: 'development',  // Можно использовать 'production' для продакшн сборки
};
