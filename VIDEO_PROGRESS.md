# Video Consultation — Progress

## Status: 🟢 Complete

### Part 1: Backend (vizito-booking)
- [x] Migration for video_room, video_started_at, video_ended_at on appointments table
- [x] Entity update for Appointment
- [x] Doctor endpoints: POST start-video / end-video / video-status
- [x] Patient view: can_join / join_url / how / room_name changes
- [x] Room name generation (vizito-{24 hex chars})

### Part 2: Partner App (doctor)
- [x] Start video call button on appointment detail & workspace
- [x] End video call button
- [x] Jitsi Meet iframe in consultation modal
- [x] Remove "in-app video not available" text for active video bookings

### Part 3: Patient App
- [x] Video waiting room page
- [x] Device check (camera, mic, speaker, network)
- [x] In-call page with Jitsi embed
- [x] Call timer, controls, side panel
- [x] Routing

### Files Modified & Created
- `vizito-replica-backend/vizito-booking/src/migrations/1793750000000-VideoRoom.ts`
- `vizito-replica-backend/vizito-booking/src/bookings/appointments/entities/appointment.entity.ts`
- `vizito-replica-backend/vizito-booking/src/bookings/appointments/appointments.service.ts`
- `vizito-replica-backend/vizito-booking/src/bookings/appointments/appointments.controller.ts`
- `vizito-replica-backend/vizito-booking/src/bookings/patient-booking.service.ts`
- `vizito-partner-main/src/data/services/endpoints.ts`
- `vizito-partner-main/src/data/services/bookingHelper.ts`
- `vizito-partner-main/src/presentation/modules/appointments/AppointmentsScreen.tsx`
- `vizito-partner-main/src/presentation/modules/appointments/ConsultationWorkspace.tsx`
- `vizito-patient-web/src/services/dashboardHelper.ts`
- `vizito-patient-web/src/services/endpoints.ts`
- `vizito-patient-web/src/services/videoConsultationHelper.ts`
- `vizito-patient-web/src/presentation/modules/bookings/DoctorAppointmentParts.tsx`
- `vizito-patient-web/src/presentation/modules/video/VideoConsultation.css`
- `vizito-patient-web/src/presentation/modules/video/VideoWaitingRoom.tsx`
- `vizito-patient-web/src/presentation/modules/video/VideoInConsultation.tsx`
- `vizito-patient-web/src/presentation/modules/video/VideoConsultationScreen.tsx`
- `vizito-patient-web/src/navigation/AppNavigator.tsx`

### Problems
_(none yet)_
