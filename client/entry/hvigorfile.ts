import { hapTasks } from '@ohos/hvigor-ohos-plugin';
import { hvigor } from '@ohos/hvigor';
import fs from 'node:fs';
import path from 'node:path';

// Restool's legacy icon check downsamples launcher PNGs to512. Keep the approved
// 1024 layers intact before packaging; resource IDs/paths and all other media stay unchanged.
hvigor.afterNodeEvaluate((node) => {
  if (node.getNodeName() !== 'entry') return;
  node.getTaskByName('default@PackageHap')?.beforeRun(() => {
    const project = path.resolve(__dirname, '..');
    const source = path.join(project, 'AppScope/resources/base/media');
    const compiled = path.join(__dirname, 'build/default/intermediates/res/default/resources/base/media');
    for (const name of ['launcher_foreground.png', 'launcher_background.png']) {
      const bytes = fs.readFileSync(path.join(source, name));
      if (bytes.readUInt32BE(16) !==1024 || bytes.readUInt32BE(20) !==1024) {
        throw new Error('Launcher layer must remain1024×1024: '+name);
      }
      if (!fs.existsSync(path.join(compiled, name))) throw new Error('Missing compiled launcher layer: '+name);
      fs.copyFileSync(path.join(source, name), path.join(compiled, name));
    }
  });
});
export default { system: hapTasks, plugins: [] };
