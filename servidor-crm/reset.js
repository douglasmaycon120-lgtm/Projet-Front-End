// Volta os dados ao estado inicial: copia data-inicial/ por cima de data/.
// Uso: npm run reset
const fs = require('fs')
const path = require('path')

const origem = path.join(__dirname, 'data-inicial')
const destino = path.join(__dirname, 'data')
fs.mkdirSync(destino, { recursive: true })
for (const arquivo of fs.readdirSync(origem)) {
  fs.copyFileSync(path.join(origem, arquivo), path.join(destino, arquivo))
}
console.log('Dados restaurados para o estado inicial.')
