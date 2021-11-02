import { createApp } from './lib';

const port = Number(process.env.PORT || 8088);

createApp().listen(port, () => {
  console.log('Server is listening on port %d', port);
});
