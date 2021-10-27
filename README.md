# pkgm (pkg metadata)
> Allow editing metadata of pkg's windows node base binaries.  

# Why?

Due to the way pkg works it is neccessary to edit the node base binaries before they are bundled. This package aims to make this process more convinient. 

# Usage

```
npm install Sys0MKNR/pkgm
```


```js

import { exec } from 'pkgm'

const pkgmOps = {}

const taskOpts = {
  targets: ['node14-win-x64'],
  metadata: {
    version: '1.1.11',
    name: 'test',
    description: 'this is a custom test desc',
    legal: 'copyright test',
    icon: './icon.ico'
  },
  pkg: {
    out: exePath
  }
}


await exec(pkgmOps, taskOpts)

```




# Docs







