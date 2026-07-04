module.exports = {
  appId: 'com.gitfolio.app',
  productName: 'GitFolio',
  artifactName: '${productName}-${version}-${os}-${arch}.${ext}',
  directories: {
    output: 'dist'
  },
  files: [
    'out/**/*',
    'package.json'
  ],
  icon: 'build/icon.png',
  mac: {
    icon: 'build/icon.icns',
    identity: '-',
    hardenedRuntime: false,
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64']
      },
      {
        target: 'zip',
        arch: ['x64', 'arm64']
      }
    ],
    category: 'public.app-category.developer-tools'
  },
  win: {
    icon: 'build/icon.ico',
    target: [
      {
        target: 'nsis',
        arch: ['x64']
      },
      {
        target: 'portable',
        arch: ['x64']
      }
    ]
  },
  nsis: {
    artifactName: '${productName}-${version}-win-${arch}-setup.${ext}'
  },
  portable: {
    artifactName: '${productName}-${version}-win-${arch}-portable.${ext}'
  },
  linux: {
    icon: 'build/icon.png',
    maintainer: 'AungMyoKyaw <AungMyoKyaw@users.noreply.github.com>',
    target: [
      {
        target: 'AppImage',
        arch: ['x64']
      },
      {
        target: 'deb',
        arch: ['x64']
      }
    ],
    category: 'Development'
  },
  publish: {
    provider: 'github',
    owner: 'AungMyoKyaw',
    repo: 'GitFolio',
    releaseType: 'release'
  }
}
