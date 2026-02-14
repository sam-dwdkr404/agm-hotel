const imageModules = import.meta.glob('../assets/images/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
  import: 'default'
})

const imageMap = Object.entries(imageModules).reduce((acc, [path, src]) => {
  const parts = path.split('/')
  const fileName = parts[parts.length - 1]
  acc[fileName.toLowerCase()] = src
  return acc
}, {})

export function getMenuImageSrc(imageName) {
  if (!imageName) return null
  return imageMap[String(imageName).toLowerCase()] || null
}
