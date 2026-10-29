import apiClient from './index';
export type NotificationTab = 'all' | 'unread' | 'appointments' | 'reports' | 'orders' | 'payments' | 'support';
export interface PatientNotification { id:string;created_at:string;unread:boolean;read_at:string|null;type:string;group:NotificationTab;title:string;message:string;bell_title:string;priority:string|null;target_type:string|null;target_id:string|null;target_path:string|null;family_member_id:string|null;family_member_name:string|null;family_relationship:string|null;amount:number|null;currency:string|null;is_pinned:boolean;live_state:string|null;trip_id:string|null }
export interface NotificationCounts { all:number;unread:number;appointments:number;reports:number;orders:number;payments:number;support:number }
export interface NotificationFeed { items:PatientNotification[];page:number;page_size:10|20;total:number;total_pages:number;counts:NotificationCounts;pinned:PatientNotification|null }
export interface NotificationFeedParams { page:number;page_size:10|20;tab:NotificationTab;q?:string;date_from?:string;date_to?:string }
export const getPatientNotificationFeedApi=async(params:NotificationFeedParams):Promise<NotificationFeed>=>(await apiClient.get('/notifications/patient-feed',{params})).data;
export const getUnreadNotificationCountApi=async():Promise<number>=>{const d=(await apiClient.get('/notifications/unread-count')).data;return Number(d?.unread_count??d?.count??0);};
export const markAllNotificationsReadApi=async():Promise<void>=>{await apiClient.patch('/notifications/read-all');};
export const markNotificationReadApi=async(id:string):Promise<number>=>{const d=(await apiClient.patch(`/notifications/${encodeURIComponent(id)}/read`)).data;return Number(d?.unread_count??0);};
export const markNotificationUnreadApi=async(id:string):Promise<void>=>{await apiClient.patch(`/notifications/${encodeURIComponent(id)}/unread`);};
export const deleteNotificationApi=async(id:string):Promise<{undo_token:string;undo_expires_at:string;unread_count:number}>=>(await apiClient.delete(`/notifications/${encodeURIComponent(id)}`)).data;
export const undoDeleteNotificationApi=async(id:string,undo_token:string):Promise<void>=>{await apiClient.post(`/notifications/${encodeURIComponent(id)}/undo`,{undo_token});};
