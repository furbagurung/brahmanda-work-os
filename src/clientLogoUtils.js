const ALLOWED_LOGO_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
const MAX_LOGO_DIMENSION = 800
const MAX_LOGO_SIZE = 5 * 1024 * 1024

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('The selected logo could not be read. Please choose another image.'))
    }
    image.src = url
  })
}

function canvasBlob(canvas, type) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('The selected logo could not be optimized. Please choose another image.')),
      type,
      0.82,
    )
  })
}

export async function optimizeClientLogo(file) {
  if (!file || !ALLOWED_LOGO_TYPES.has(String(file.type).toLowerCase())) {
    throw new Error('Choose a JPG, PNG, or WEBP image.')
  }

  try {
    const image = await loadImage(file)
    const scale = Math.min(1, MAX_LOGO_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight))
    const width = Math.max(1, Math.round(image.naturalWidth * scale))
    const height = Math.max(1, Math.round(image.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d', { alpha: true })
    if (!context) throw new Error('Browser image optimization is unavailable.')

    const supportsWebp = canvas.toDataURL('image/webp').startsWith('data:image/webp')
    const outputType = supportsWebp ? 'image/webp' : 'image/jpeg'
    if (!supportsWebp) {
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, width, height)
    }
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(image, 0, 0, width, height)

    const blob = await canvasBlob(canvas, outputType)
    if (blob.size > MAX_LOGO_SIZE) {
      throw new Error('Logo is still too large. Please upload a smaller image.')
    }

    return new File([blob], supportsWebp ? 'client-logo.webp' : 'client-logo.jpg', {
      type: outputType,
      lastModified: Date.now(),
    })
  } catch (error) {
    if (error instanceof Error && error.message) throw error
    throw new Error('The selected logo could not be optimized. Please choose another image.')
  }
}
