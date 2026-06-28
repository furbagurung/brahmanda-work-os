const attachmentValue = (attachment, camelKey, snakeKey) => (
  attachment?.[camelKey] || attachment?.[snakeKey] || ''
)

export function getAttachmentPreviewUrl(attachment, mode = 'card') {
  const thumbnailUrl = attachmentValue(attachment, 'thumbnailUrl', 'thumbnail_url')
  const optimizedUrl = attachmentValue(attachment, 'optimizedUrl', 'optimized_url')
  const fileUrl = attachmentValue(attachment, 'fileUrl', 'file_url')
  const legacyUrl = attachment?.url || ''
  const isImage = Boolean(
    attachment?.isImage
    || Number(attachment?.is_image) === 1
    || String(attachment?.mimeType || attachment?.mime_type || '').startsWith('image/'),
  )

  if (mode === 'download') return fileUrl || legacyUrl
  if (mode === 'modal') {
    return optimizedUrl || thumbnailUrl || (isImage ? '' : fileUrl || legacyUrl)
  }
  return thumbnailUrl
}

const browserOptimizableImageTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])

const canvasBlob = (canvas, type, quality) => new Promise((resolve) => {
  canvas.toBlob(resolve, type, quality)
})

export async function optimizeAttachmentImageForUpload(file) {
  if (!browserOptimizableImageTypes.has(file?.type)) return file

  let bitmap
  let objectUrl = ''
  try {
    if (typeof createImageBitmap === 'function') {
      bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    } else {
      objectUrl = URL.createObjectURL(file)
      bitmap = await new Promise((resolve, reject) => {
        const image = new Image()
        image.onload = () => resolve(image)
        image.onerror = () => reject(new Error('The selected image could not be decoded.'))
        image.src = objectUrl
      })
    }

    const sourceWidth = bitmap.width || bitmap.naturalWidth
    const sourceHeight = bitmap.height || bitmap.naturalHeight
    if (!sourceWidth || !sourceHeight) {
      throw new Error('The selected image dimensions are invalid.')
    }

    const targetWidth = Math.min(sourceWidth, 2000)
    const targetHeight = Math.max(1, Math.round(sourceHeight * (targetWidth / sourceWidth)))
    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight
    const context = canvas.getContext('2d', { alpha: true })
    if (!context) throw new Error('Browser image optimization is unavailable.')
    context.drawImage(bitmap, 0, 0, targetWidth, targetHeight)

    const blob = await canvasBlob(canvas, 'image/webp', 0.82)
    if (!blob) throw new Error('Browser image optimization failed.')
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'attachment'
    return new File([blob], `${baseName}-optimized.webp`, {
      type: blob.type || 'image/webp',
      lastModified: Date.now(),
    })
  } finally {
    if (typeof bitmap?.close === 'function') bitmap.close()
    if (objectUrl) URL.revokeObjectURL(objectUrl)
  }
}
