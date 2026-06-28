export const TASK_STATUSES = ['New', 'In Progress', 'Waiting for Client', 'Revision', 'Completed']
export const PRIORITIES = ['Urgent', 'High', 'Medium', 'Low']
export const CATEGORIES = ['Reels', 'Print Design', 'Creative', 'Web', 'Reporting', 'Digital']

export const initialClients = [
  { id: 'client-1', name: '20D Cinema', initials: '20', color: '#002FA7', contact: 'Marketing Team', email: 'marketing@20dcinema.example', phone: '+977 9800000001', status: 'Active', notes: 'Film promotion, social media, and campaign creative.' },
  { id: 'client-2', name: 'Pranam Agro Foods', initials: 'PA', color: '#E4002B', contact: 'Brand Team', email: 'brand@pranamagro.example', phone: '+977 9800000002', status: 'Active', notes: 'Packaging, product communication, and distributor materials.' },
  { id: 'client-3', name: 'Malta Peppers', initials: 'MP', color: '#18181B', contact: 'Operations Team', email: 'operations@maltapeppers.example', phone: '+977 9800000003', status: 'Active', notes: 'Website, performance marketing, and monthly reporting.' },
  { id: 'client-4', name: 'Kittik Enterprise', initials: 'KE', color: '#52525B', contact: 'Management', email: 'management@kittik.example', phone: '+977 9800000004', status: 'Active', notes: 'Company profile, digital presence, and content support.' },
]

export const initialTasks = [
  { id: 'task-1', clientId: 'client-1', title: 'June reels calendar', description: 'Finalize the monthly content calendar and secure internal approval.', category: 'Reels', priority: 'High', deadline: '2026-06-25', status: 'In Progress', proofLink: 'https://drive.google.com', billable: false, amount: 0, assignee: 'AS', completedAt: '' },
  { id: 'task-2', clientId: 'client-2', title: 'Product label revisions', description: 'Apply copy corrections to the final packaging files.', category: 'Print Design', priority: 'Urgent', deadline: '2026-06-25', status: 'Revision', proofLink: 'https://figma.com', billable: true, amount: 6500, assignee: 'NK', completedAt: '', paymentStatus: 'Unpaid', invoiceStatus: 'Not invoiced' },
  { id: 'task-3', clientId: 'client-3', title: 'Website performance review', description: 'Review Core Web Vitals and prepare the optimization checklist.', category: 'Web', priority: 'Medium', deadline: '2026-06-26', status: 'New', proofLink: '', billable: false, amount: 0, assignee: 'SB', completedAt: '' },
  { id: 'task-4', clientId: 'client-4', title: 'Company profile copy', description: 'Review the first draft with the client and collect feedback.', category: 'Creative', priority: 'Medium', deadline: '2026-06-27', status: 'Waiting for Client', proofLink: 'https://docs.google.com', billable: false, amount: 0, assignee: 'AS', completedAt: '' },
  { id: 'task-5', clientId: 'client-1', title: 'Movie campaign key visual', description: 'Create the primary visual direction for the upcoming campaign.', category: 'Creative', priority: 'High', deadline: '2026-06-28', status: 'In Progress', proofLink: 'https://figma.com', billable: true, amount: 12000, assignee: 'NK', completedAt: '', paymentStatus: 'Unpaid', invoiceStatus: 'Draft' },
  { id: 'task-6', clientId: 'client-2', title: 'Distributor presentation', description: 'Prepare a concise sales presentation for distributor meetings.', category: 'Creative', priority: 'Low', deadline: '2026-06-30', status: 'New', proofLink: '', billable: true, amount: 8500, assignee: 'SB', completedAt: '', paymentStatus: 'Unpaid', invoiceStatus: 'Not invoiced' },
  { id: 'task-7', clientId: 'client-3', title: 'Meta ads report', description: 'Compile campaign results and next-month recommendations.', category: 'Reporting', priority: 'Medium', deadline: '2026-06-24', status: 'Completed', proofLink: 'https://drive.google.com', billable: false, amount: 0, assignee: 'AS', completedAt: '2026-06-24' },
  { id: 'task-8', clientId: 'client-4', title: 'Google Business update', description: 'Update business hours, services, and recent project photos.', category: 'Digital', priority: 'Low', deadline: '2026-06-24', status: 'Completed', proofLink: 'https://business.google.com', billable: false, amount: 0, assignee: 'NK', completedAt: '2026-06-24' },
]
