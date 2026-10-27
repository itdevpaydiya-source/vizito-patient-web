import apiClient from '../../../services';

export type RentalCategory='OXYGEN'|'BED'|'MOBILITY'|'MONITOR'|'OTHER';
export interface RentalHistory {status:string;title:string;timestamp:string;note?:string}
export interface RentalPayment {amount:number;method:string;paid_at:string|null;transaction_number:string|null;status:string;for:string}
export interface RentalExtension {from_end:string;to_end:string;extra_days:number;amount:number;payment_status:'INCLUDED'|'DUE'|'PAID';at?:string}
export interface RentalOrder {
 id:number;order_number:string;provider_id:string;product_id:number;status:string;order_type:'RENT';category:RentalCategory;
 start_date:string;end_date:string;duration_days:number;quantity:number;daily_rental_price:number|string;created_at:string;
 can_cancel:boolean;cancel_unavailable_reason:string|null;cancel_refund_note:string|null;
 can_schedule_return:boolean;return_unavailable_reason:string|null;can_extend:boolean;extend_unavailable_reason:string|null;max_rental_days:number|null;
 product:{id:number;name:string;brand:string|null;model_number?:string|null;primary_image_url:string|null;deposit_amount:number|string;instructions?:string|null};
 provider:{id:string;name:string;phone:string|null;address:string|null};
 bill:{rental_fee:number;delivery_fee:number;discount_amount:number;total_amount:number;deposit_amount:number;deposit_included_in_total:boolean;amount_due:number};
 payments:RentalPayment[];invoice_number:string|null;extensions:RentalExtension[];
 deposit:{amount:number;status:'NOT_COLLECTED'|'HELD'|'REFUNDED'|'UNDER_REVIEW';collected_at:string|null;refunded_at:string|null;refund_amount:number|null;deductions:{amount:number;reason:string}[];review_note?:string|null};
 delivered_at:string|null;delivery_code:string|null;return_code:string|null;
 delivery_address:{addressLine?:string;city?:string;pincode?:string;instructions?:string;delivery_status?:string;dispatched_at?:string;status_history?:RentalHistory[];condition_at_delivery?:string;return_schedule?:{status?:string;scheduled_at?:string;requested_date?:string;collected_at?:string;pickup_address?:string;pickup_window?:string}};
}
export interface RentalProfile {id:string;business_name?:string;address?:string;phone?:string;logo?:string|null}
export interface ExtensionPreview {current_end_date:string;new_end_date:string;extra_days:number;total_days:number;daily_rate:number;quantity:number;additional_rental_fee:number;additional_delivery_fee:number;additional_deposit:number;discount_amount:number;additional_total:number;pay_when:string}
const base='/rental/patient/orders';
const owned=(id:string|number)=>`${base}/${encodeURIComponent(id)}`;
export const rentalOrdersApi={
 list:async():Promise<RentalOrder[]>=>{const r=await apiClient.get(base+'/mine');if(!Array.isArray(r.data))throw new Error('Invalid rental orders response.');return r.data;},
 detail:async(id:string|number):Promise<RentalOrder>=>(await apiClient.get(owned(id))).data,
 profile:async(id:string):Promise<RentalProfile>=>(await apiClient.get(`/rental/patient/providers/${encodeURIComponent(id)}/profile`)).data,
 preview:async(id:string|number,new_end_date:string):Promise<ExtensionPreview>=>(await apiClient.get(owned(id)+'/extend-preview',{params:{new_end_date}})).data,
 extend:async(id:string|number,new_end_date:string):Promise<RentalOrder>=>(await apiClient.post(owned(id)+'/extend',{new_end_date})).data,
 cancel:async(id:string|number,reason:string):Promise<RentalOrder>=>(await apiClient.post(owned(id)+'/cancel',{reason})).data,
 scheduleReturn:async(id:string|number,input:{requested_date:string;pickup_address:string;pickup_window?:string;condition_notes?:string}):Promise<RentalOrder>=>(await apiClient.post(owned(id)+'/return',input)).data,
};
