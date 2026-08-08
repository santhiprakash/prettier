module.exports = {
  cacheStores: ({FileStore}) => {
    return [new FileStore({root: __dirname})];
  },
} /*:: as InputConfigT*/;
