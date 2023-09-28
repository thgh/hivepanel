const fs = require('fs')

const replaceInFiles = (files, from, to) => {
  files.forEach((file) => {
    let content = fs.readFileSync(file, 'utf8')
    content = content.replace(new RegExp(from, 'g'), to)
    fs.writeFileSync(file, content, 'utf8')
  })
}

const filesToModifyMjs = ['bundle/server.mjs', 'bundle/bin.mjs']
replaceInFiles(filesToModifyMjs, "'./index'", "'./index.mjs'")

const filesToModifyCjs = ['bundle/server.cjs', 'bundle/bin.cjs']
replaceInFiles(filesToModifyCjs, "'./index'", "'./index.cjs'")
