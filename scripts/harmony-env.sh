# 在专用鸿蒙终端中执行：source scripts/harmony-env.sh
# 仅影响当前终端，后端继续使用原有 Node 24。
export DEVECO_HOME="/Applications/DevEco-Studio.app/Contents"
export DEVECO_SDK_HOME="$DEVECO_HOME/sdk"
export JAVA_HOME="$DEVECO_HOME/jbr/Contents/Home"
export NODE_HOME="$DEVECO_HOME/tools/node"
export PATH="$DEVECO_HOME/tools/node/bin:$DEVECO_HOME/tools/ohpm/bin:$DEVECO_HOME/tools/hvigor/bin:$DEVECO_HOME/sdk/default/openharmony/toolchains:$JAVA_HOME/bin:$PATH"
