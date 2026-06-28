const attachmentValue = (attachment, camelKey, snakeKey) => (
  attachment?.[camelKey] || attachment?.[snakeKey] || ''
)

export function getAttachmentPreviewUrl(attachment, mode = 'card') {
  const thumbnailUrl = attachmentValue(attachment, 'thumbnailUrl', 'thumbnail_url')
  const optimizedUrl = attachmentValue(attachment, 'optimizedUrl', 'optimized_url')
  const fileUrl = attachmentValue(attachment, 'fileUrl', 'file_url')
  const legacyUrl = attachment?.url || ''

  if (mode === 'download') return fileUrl || legacyUrl
  if (mode === 'modal') return optimizedUrl || thumbnailUrl || fileUrl || legacyUrl
  return thumbnailUrl || optimizedUrl || fileUrl || legacyUrl
}

