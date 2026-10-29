import {beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({get:vi.fn(),patch:vi.fn(),del:vi.fn(),post:vi.fn()}));
vi.mock('./index',()=>({default:{get:mocks.get,patch:mocks.patch,delete:mocks.del,post:mocks.post}}));
import {deleteNotificationApi,getPatientNotificationFeedApi,markNotificationReadApi,undoDeleteNotificationApi} from './notificationHelper';

describe('notification patient feed API',()=>{
 beforeEach(()=>vi.clearAllMocks());
 it('sends server paging and filters without changing the contract',async()=>{const data={items:[],page:2,page_size:20,total:0,total_pages:0,counts:{all:0,unread:0,appointments:0,reports:0,orders:0,payments:0,support:0},pinned:null};mocks.get.mockResolvedValue({data});expect(await getPatientNotificationFeedApi({page:2,page_size:20,tab:'reports',q:'cbc',date_from:'2026-10-01'})).toBe(data);expect(mocks.get).toHaveBeenCalledWith('/notifications/patient-feed',{params:{page:2,page_size:20,tab:'reports',q:'cbc',date_from:'2026-10-01'}});});
 it('uses returned unread count when marking one read',async()=>{mocks.patch.mockResolvedValue({data:{unread_count:7}});await expect(markNotificationReadApi('a/b')).resolves.toBe(7);expect(mocks.patch).toHaveBeenCalledWith('/notifications/a%2Fb/read');});
 it('passes the opaque undo token back to the matching notification',async()=>{mocks.del.mockResolvedValue({data:{undo_token:'secret',undo_expires_at:'soon',unread_count:2}});await deleteNotificationApi('n1');await undoDeleteNotificationApi('n1','secret');expect(mocks.post).toHaveBeenCalledWith('/notifications/n1/undo',{undo_token:'secret'});});
});
