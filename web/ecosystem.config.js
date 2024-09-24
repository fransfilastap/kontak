module.exports = {
  apps: [
    {
      name: "kontak-web",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      instances: "1",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
