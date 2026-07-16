import React, { useState, useEffect } from 'react';
import type { UserRole } from './UserTypeSelection';
import {
  ArrowLeft,
  User,
  Briefcase,
  CheckCircle2,
  ShieldAlert,
  Stethoscope,
  Building,
  Building2,
  Pill,
  Microscope,
  Home,
  Truck,
  Mail,
  Smartphone,
  Edit2
} from 'lucide-react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { registerProviderApi, PROVIDER_TYPE_MAP } from '../services/authHelper';

interface RegistrationModuleProps {
  role?: UserRole;
  onBackToRoles?: () => void;
  onBackToLogin?: () => void;
  onRegisterSuccess: (userData: any) => void;
}

export default function RegistrationModule({
  role,
  onBackToRoles,
  onBackToLogin,
  onRegisterSuccess
}: RegistrationModuleProps) {
  const [step, setStep] = useState(1);
  const handleBackNavigation = onBackToLogin || onBackToRoles || (() => { });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Step 1: Personal Info
  const [personalValues, setPersonalValues] = useState({
    fullName: '',
    mobileNumber: '',
    emailAddress: '',
    dob: '',
    gender: '',
    password: ''
  });

  // Step 2: Provider Category Selection
  const [providerCategory, setProviderCategory] = useState<UserRole | ''>(role || '');

  // Step 3: Flat State structure to avoid Formik Union Type TS compilation errors
  const [step3Values, setStep3Values] = useState({
    medicalRegNo: '',
    qualification: '',
    specialization: '',
    experience: '',
    superSpecialization: '',
    languagesKnown: '',
    hospitalName: '',
    hospitalRegNo: '',
    clinicName: '',
    clinicRegNo: '',
    pharmacyName: '',
    drugLicenseNo: '',
    laboratoryName: '',
    laboratoryRegNo: '',
    organizationName: '',
    authorizedPersonName: ''
  });



  // Categories list definition
  const categories = [
    {
      id: 'doctor' as UserRole,
      title: "Medical Doctor",
      description: "Consult patients online or in clinic, write e-prescriptions, and manage clinical schedules.",
      icon: Stethoscope,
      color: "text-teal-600",
      bgHover: "hover:border-teal-500/30 hover:shadow-teal-500/5 hover:bg-teal-50/30"
    },
    {
      id: 'hospital' as UserRole,
      title: "Hospital Center",
      description: "Manage emergency services, bed availability, multi-department doctors, and ward logistics.",
      icon: Building2,
      color: "text-teal-600",
      bgHover: "hover:border-teal-500/30 hover:shadow-teal-500/5 hover:bg-teal-50/30"
    },
    {
      id: 'clinic' as UserRole,
      title: "Clinic Facility",
      description: "Manage multiple doctors, appointments, reception queues, bills, and clinical operations.",
      icon: Building,
      color: "text-teal-600",
      bgHover: "hover:border-teal-500/30 hover:shadow-teal-500/5 hover:bg-teal-50/30"
    },
    {
      id: 'pharmacy' as UserRole,
      title: "Pharmacy / Drugstore",
      description: "Fulfill prescription orders, track medicine inventory, manage deliveries, and billing.",
      icon: Pill,
      color: "text-teal-600",
      bgHover: "hover:border-teal-500/30 hover:shadow-teal-500/5 hover:bg-teal-50/30"
    },
    {
      id: 'diagnostic' as UserRole,
      title: "Laboratory / Diagnostic Center",
      description: "Offer home sample collection, manage laboratory processing, and upload patient digital reports.",
      icon: Microscope,
      color: "text-teal-600",
      bgHover: "hover:border-teal-500/30 hover:shadow-teal-500/5 hover:bg-teal-50/30"
    },
    {
      id: 'homecare' as UserRole,
      title: "Home Care Provider",
      description: "Offer physical therapy, nursing care, elderly assistance, and post-surgery patient services.",
      icon: Home,
      color: "text-teal-600",
      bgHover: "hover:border-teal-500/30 hover:shadow-teal-500/5 hover:bg-teal-50/30"
    },
    {
      id: 'ambulance' as UserRole,
      title: "Ambulance Operator",
      description: "Receive dispatch alerts, track emergency fleets, and transport patients to critical care.",
      icon: Truck,
      color: "text-teal-600",
      bgHover: "hover:border-teal-500/30 hover:shadow-teal-500/5 hover:bg-teal-50/30"
    },
    {
      id: 'equipment' as UserRole,
      title: "Equipment Rental Provider",
      description: "Provide medical device leasing, surgical tools delivery, and diagnostic equipment rentals.",
      icon: Briefcase,
      color: "text-teal-600",
      bgHover: "hover:border-teal-500/30 hover:shadow-teal-500/5 hover:bg-teal-50/30"
    }
  ];

  // Helper to get selected category label
  const getCategoryLabel = (id: string) => {
    const found = categories.find(c => c.id === id);
    return found ? found.title : id;
  };

  // Formik validation schemas using Yup
  const step1Schema = Yup.object().shape({
    fullName: Yup.string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must be under 100 characters')
      .matches(/^[a-zA-Z\s.]+$/, 'Name can only contain letters, spaces, and dots')
      .required('Full Name is required'),
    mobileNumber: Yup.string()
      .matches(/^\d{10}$/, 'Mobile Number must be exactly 10 digits')
      .required('Mobile Number is required'),
    emailAddress: Yup.string()
      .email('Please enter a valid email address')
      .required('Email Address is required'),
    dob: Yup.date()
      .max(new Date(), 'Date of Birth cannot be a future date')
      .required('Date of Birth is required'),
    gender: Yup.string()
      .oneOf(['Male', 'Female', 'Other'], 'Please select a gender')
      .required('Gender is required'),
    password: Yup.string()
      .min(6, 'Password must be at least 6 characters')
      .required('password is required'),
  });

  const getStep3Schema = () => {
    switch (providerCategory) {
      case 'doctor':
        return Yup.object().shape({
          medicalRegNo: Yup.string().required('Medical Registration Number is required'),
          qualification: Yup.string().required('Qualification is required'),
          specialization: Yup.string().required('Specialization is required'),
          experience: Yup.number()
            .typeError('Experience must be a number')
            .min(0, 'Experience cannot be negative')
            .required('Years of Experience is required'),
          superSpecialization: Yup.string().optional(),
          languagesKnown: Yup.string().optional(),
        });
      case 'hospital':
        return Yup.object().shape({
          hospitalName: Yup.string().required('Hospital Name is required'),
          hospitalRegNo: Yup.string().required('Hospital Registration Number is required'),
          authorizedPersonName: Yup.string().required('Authorized Person Name is required'),
        });
      case 'clinic':
        return Yup.object().shape({
          clinicName: Yup.string().required('Clinic Name is required'),
          clinicRegNo: Yup.string().required('Clinic Registration Number is required'),
          authorizedPersonName: Yup.string().required('Authorized Person Name is required'),
        });
      case 'pharmacy':
        return Yup.object().shape({
          pharmacyName: Yup.string().required('Pharmacy Name is required'),
          drugLicenseNo: Yup.string().required('Drug License Number is required'),
          authorizedPersonName: Yup.string().required('Authorized Person Name is required'),
        });
      case 'diagnostic':
        return Yup.object().shape({
          laboratoryName: Yup.string().required('Laboratory Name is required'),
          laboratoryRegNo: Yup.string().required('Laboratory Registration Number is required'),
          authorizedPersonName: Yup.string().required('Authorized Person Name is required'),
        });
      case 'homecare':
      case 'ambulance':
      case 'equipment':
      default:
        return Yup.object().shape({
          organizationName: Yup.string().required('Organization Name is required'),
          authorizedPersonName: Yup.string().required('Authorized Person Name is required'),
        });
    }
  };



  // Build the unified final data structure for dashboard redirection
  const handleFinalSubmit = () => {
    let professionalInfo = {};
    let finalFullName = personalValues.fullName;

    switch (providerCategory) {
      case 'doctor':
        professionalInfo = {
          medicalRegNo: step3Values.medicalRegNo,
          qualification: step3Values.qualification,
          specialization: step3Values.specialization,
          experience: step3Values.experience,
          superSpecialization: step3Values.superSpecialization,
          languagesKnown: step3Values.languagesKnown
        };
        break;
      case 'hospital':
        professionalInfo = {
          hospitalName: step3Values.hospitalName,
          hospitalRegNo: step3Values.hospitalRegNo,
          authorizedPersonName: step3Values.authorizedPersonName
        };
        finalFullName = step3Values.authorizedPersonName;
        break;
      case 'clinic':
        professionalInfo = {
          clinicName: step3Values.clinicName,
          clinicRegNo: step3Values.clinicRegNo,
          authorizedPersonName: step3Values.authorizedPersonName
        };
        finalFullName = step3Values.authorizedPersonName;
        break;
      case 'pharmacy':
        professionalInfo = {
          pharmacyName: step3Values.pharmacyName,
          drugLicenseNo: step3Values.drugLicenseNo,
          authorizedPersonName: step3Values.authorizedPersonName
        };
        finalFullName = step3Values.authorizedPersonName;
        break;
      case 'diagnostic':
        professionalInfo = {
          laboratoryName: step3Values.laboratoryName,
          laboratoryRegNo: step3Values.laboratoryRegNo,
          authorizedPersonName: step3Values.authorizedPersonName
        };
        finalFullName = step3Values.authorizedPersonName;
        break;
      case 'homecare':
      case 'ambulance':
      case 'equipment':
        professionalInfo = {
          organizationName: step3Values.organizationName,
          authorizedPersonName: step3Values.authorizedPersonName
        };
        finalFullName = step3Values.authorizedPersonName;
        break;
    }

    const finalData = {
      role: providerCategory || 'doctor',
      fullName: finalFullName,
      email: personalValues.emailAddress,
      mobile: personalValues.mobileNumber,
      dob: personalValues.dob,
      gender: personalValues.gender,
      professionalInfo
    };

    onRegisterSuccess(finalData);
  };

  // Step labels for top header
  const stepsList = [
    { id: 1, label: "Personal Info" },
    { id: 2, label: "Provider Type" },
    { id: 3, label: "Professional Info" },
    { id: 4, label: "Review" }
  ];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto animate-fade">
      <div className="flex flex-col items-center py-8 px-6 max-w-3xl mx-auto w-full">

        {/* Back Button */}
        {step < 5 && (
          <div className="w-full flex justify-start mb-6">
            <button
              onClick={() => {
                if (step === 1) {
                  handleBackNavigation();
                } else {
                  setStep(prev => prev - 1);
                }
              }}
              className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-700 text-xs font-bold uppercase transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> {step === 1 ? "Back to Login" : `Back to Step ${step - 1}`}
            </button>
          </div>
        )}

        <div className="glass-panel w-full bg-white p-8 md:p-10 border border-slate-100 shadow-xl rounded-3xl relative overflow-hidden">
          {/* Decorative Top Accent */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-teal-500 to-secondary"></div>

          {/* Stepper Headers */}
          {step <= 4 && (
            <div className="flex items-center justify-between gap-2 mb-8 overflow-x-auto pb-2 scrollbar-none">
              {stepsList.map((s, idx) => (
                <React.Fragment key={s.id}>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${step === s.id
                        ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                        : step > s.id
                          ? 'bg-teal-100 text-teal-700'
                          : 'bg-slate-100 text-slate-400'
                      }`}>
                      {s.id}
                    </span>
                    <span className={`text-xs font-extrabold ${step === s.id ? 'text-slate-800' : 'text-slate-400'}`}>
                      {s.label}
                    </span>
                  </div>
                  {idx < stepsList.length - 1 && (
                    <div className={`h-0.5 w-6 md:w-10 shrink-0 ${step > s.id ? 'bg-teal-200' : 'bg-slate-100'}`}></div>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Step 1: Personal Info Form */}
          {step === 1 && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <User className="w-6 h-6 text-teal-600" />
                  Personal Information
                </h2>
                <p className="text-slate-500 text-sm mt-1 font-medium">
                  Please provide your personal details to initialize your provider identity.
                </p>
              </div>

              <Formik
                initialValues={personalValues}
                validationSchema={step1Schema}
                onSubmit={(values) => {
                  setPersonalValues(values);
                  setStep(2);
                }}
              >
                {({ errors, touched, values, handleChange, handleBlur }) => (
                  <Form className="space-y-5">
                    <div className="form-group">
                      <label className="form-label">Full Name *</label>
                      <input
                        type="text"
                        name="fullName"
                        className={`form-control ${touched.fullName && errors.fullName ? 'border-rose-450' : ''}`}
                        placeholder="Dr. John Doe / Authorized Representative Name"
                        value={values.fullName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                      {touched.fullName && errors.fullName && (
                        <p className="text-rose-500 text-xs mt-1 font-bold">{errors.fullName}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="form-group mb-0">
                        <label className="form-label">Mobile Number *</label>
                        <div className={`flex items-center border rounded-xl overflow-hidden focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10 transition-all ${touched.mobileNumber && errors.mobileNumber ? 'border-rose-450' : 'border-slate-200'
                          }`}>
                          <span className="px-3.5 py-3 bg-slate-50 border-r border-slate-200 text-slate-500 font-bold text-sm whitespace-nowrap">
                            +91
                          </span>
                          <input
                            type="tel"
                            name="mobileNumber"
                            maxLength={10}
                            className="flex-1 px-4 py-3 text-sm font-semibold text-slate-800 bg-white outline-none placeholder:text-slate-400"
                            placeholder="98765 43210"
                            value={values.mobileNumber}
                            onChange={(e) => {
                              e.target.value = e.target.value.replace(/\D/g, '');
                              handleChange(e);
                            }}
                            onBlur={handleBlur}
                          />
                        </div>
                        {touched.mobileNumber && errors.mobileNumber && (
                          <p className="text-rose-500 text-xs mt-1 font-bold">{errors.mobileNumber}</p>
                        )}
                      </div>

                      <div className="form-group mb-0">
                        <label className="form-label">Email Address *</label>
                        <input
                          type="email"
                          name="emailAddress"
                          className={`form-control ${touched.emailAddress && errors.emailAddress ? 'border-rose-450' : ''}`}
                          placeholder="name@healthcare.com"
                          value={values.emailAddress}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        />
                        {touched.emailAddress && errors.emailAddress && (
                          <p className="text-rose-500 text-xs mt-1 font-bold">{errors.emailAddress}</p>
                        )}
                      </div>
                      <div className="form-group">
                        <label className="form-label">Password *</label>
                        <input
                          type="password"
                          name="password"
                          className={`form-control ${touched.password && errors.password ? 'border-rose-450' : ''}`}
                          placeholder="••••••••"
                          value={values.password}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        />
                        {touched.password && errors.password && (
                          <p className="text-rose-500 text-xs mt-1 font-bold">{errors.password}</p>
                        )}
                      </div>

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="form-group mb-0">
                        <label className="form-label">Date of Birth *</label>
                        <input
                          type="date"
                          name="dob"
                          className={`form-control ${touched.dob && errors.dob ? 'border-rose-450' : ''}`}
                          value={values.dob}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        />
                        {touched.dob && errors.dob && (
                          <p className="text-rose-500 text-xs mt-1 font-bold">{errors.dob}</p>
                        )}
                      </div>

                      <div className="form-group mb-0">
                        <label className="form-label">Gender *</label>
                        <select
                          name="gender"
                          className={`form-control ${touched.gender && errors.gender ? 'border-rose-450' : ''}`}
                          value={values.gender}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                        {touched.gender && errors.gender && (
                          <p className="text-rose-500 text-xs mt-1 font-bold">{errors.gender}</p>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary w-full py-3.5 mt-4"
                    >
                      Continue
                    </button>
                  </Form>
                )}
              </Formik>
            </div>
          )}

          {/* Step 2: Provider Category Selection */}
          {step === 2 && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <Briefcase className="w-6 h-6 text-teal-600" />
                  Provider Category
                </h2>
                <p className="text-slate-500 text-sm mt-1 font-medium">
                  Identify your type of healthcare provider role. Only one category is allowed.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = providerCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setProviderCategory(cat.id)}
                      className={`text-left p-5 border rounded-2xl transition-all duration-200 ${cat.bgHover} ${isSelected
                          ? 'border-teal-500 bg-teal-50/40 ring-2 ring-teal-500/10 shadow-md shadow-teal-500/5'
                          : 'border-slate-200 bg-white'
                        }`}
                    >
                      <div className="flex gap-4">
                        <div className={`p-3 rounded-xl bg-slate-50 border border-slate-100 ${cat.color} shrink-0`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-800 leading-tight">
                              {cat.title}
                            </span>
                            {isSelected && (
                              <span className="w-4 h-4 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-bold">
                                ✓
                              </span>
                            )}
                          </div>
                          <p className="text-slate-500 text-xs font-semibold leading-relaxed mt-1">
                            {cat.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {providerCategory === '' && (
                <p className="text-rose-500 text-xs font-bold mb-4">Please select a provider category to continue.</p>
              )}

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn bg-slate-100 hover:bg-slate-200 text-slate-700 w-1/3 py-3.5 font-bold"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={providerCategory === ''}
                  onClick={() => setStep(3)}
                  className="btn btn-primary flex-1 py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Professional Info (Dynamic Forms) */}
          {step === 3 && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <Briefcase className="w-6 h-6 text-teal-600" />
                  Professional Information
                </h2>
                <p className="text-slate-500 text-sm mt-1 font-medium">
                  Provide verified clinical and operations info for your **{getCategoryLabel(providerCategory)}** role.
                </p>
              </div>

              <Formik
                initialValues={step3Values}
                validationSchema={getStep3Schema()}
                onSubmit={(values) => {
                  setStep3Values(values);
                  setStep(4);
                }}
              >
                {({ errors, touched, values, handleChange, handleBlur }) => (
                  <Form className="space-y-5">
                    {/* Doctor Specific Form Fields */}
                    {providerCategory === 'doctor' && (
                      <>
                        <div className="form-group mb-0">
                          <label className="form-label">Medical Registration Number *</label>
                          <input
                            type="text"
                            name="medicalRegNo"
                            className={`form-control ${touched.medicalRegNo && errors.medicalRegNo ? 'border-rose-450' : ''}`}
                            placeholder="e.g. MCI-12345"
                            value={values.medicalRegNo}
                            onChange={handleChange}
                            onBlur={handleBlur}
                          />
                          {touched.medicalRegNo && errors.medicalRegNo && (
                            <p className="text-rose-500 text-xs mt-1 font-bold">{errors.medicalRegNo}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="form-group mb-0">
                            <label className="form-label">Qualification *</label>
                            <input
                              type="text"
                              name="qualification"
                              className={`form-control ${touched.qualification && errors.qualification ? 'border-rose-450' : ''}`}
                              placeholder="e.g. MBBS, MD (Medicine)"
                              value={values.qualification}
                              onChange={handleChange}
                              onBlur={handleBlur}
                            />
                            {touched.qualification && errors.qualification && (
                              <p className="text-rose-500 text-xs mt-1 font-bold">{errors.qualification}</p>
                            )}
                          </div>

                          <div className="form-group mb-0">
                            <label className="form-label">Specialization *</label>
                            <input
                              type="text"
                              name="specialization"
                              className={`form-control ${touched.specialization && errors.specialization ? 'border-rose-450' : ''}`}
                              placeholder="e.g. Cardiologist"
                              value={values.specialization}
                              onChange={handleChange}
                              onBlur={handleBlur}
                            />
                            {touched.specialization && errors.specialization && (
                              <p className="text-rose-500 text-xs mt-1 font-bold">{errors.specialization}</p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="form-group mb-0">
                            <label className="form-label">Years of Experience *</label>
                            <input
                              type="number"
                              name="experience"
                              min={0}
                              className={`form-control ${touched.experience && errors.experience ? 'border-rose-450' : ''}`}
                              placeholder="e.g. 8"
                              value={values.experience}
                              onChange={handleChange}
                              onBlur={handleBlur}
                            />
                            {touched.experience && errors.experience && (
                              <p className="text-rose-500 text-xs mt-1 font-bold">{errors.experience}</p>
                            )}
                          </div>

                          <div className="form-group mb-0">
                            <label className="form-label">Super Specialization (Optional)</label>
                            <input
                              type="text"
                              name="superSpecialization"
                              className="form-control"
                              placeholder="e.g. Interventional Cardiology"
                              value={values.superSpecialization}
                              onChange={handleChange}
                              onBlur={handleBlur}
                            />
                          </div>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Languages Known (Optional)</label>
                          <input
                            type="text"
                            name="languagesKnown"
                            className="form-control"
                            placeholder="e.g. English, Hindi, Telugu"
                            value={values.languagesKnown}
                            onChange={handleChange}
                            onBlur={handleBlur}
                          />
                        </div>
                      </>
                    )}

                    {/* Hospital Specific Form Fields */}
                    {providerCategory === 'hospital' && (
                      <>
                        <div className="form-group mb-0">
                          <label className="form-label">Hospital Name *</label>
                          <input
                            type="text"
                            name="hospitalName"
                            className={`form-control ${touched.hospitalName && errors.hospitalName ? 'border-rose-450' : ''}`}
                            placeholder="e.g. City Central Hospital"
                            value={values.hospitalName}
                            onChange={handleChange}
                            onBlur={handleBlur}
                          />
                          {touched.hospitalName && errors.hospitalName && (
                            <p className="text-rose-500 text-xs mt-1 font-bold">{errors.hospitalName}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="form-group mb-0">
                            <label className="form-label">Hospital Registration Number *</label>
                            <input
                              type="text"
                              name="hospitalRegNo"
                              className={`form-control ${touched.hospitalRegNo && errors.hospitalRegNo ? 'border-rose-450' : ''}`}
                              placeholder="e.g. HOSP-987654"
                              value={values.hospitalRegNo}
                              onChange={handleChange}
                              onBlur={handleBlur}
                            />
                            {touched.hospitalRegNo && errors.hospitalRegNo && (
                              <p className="text-rose-500 text-xs mt-1 font-bold">{errors.hospitalRegNo}</p>
                            )}
                          </div>

                          <div className="form-group mb-0">
                            <label className="form-label">Authorized Person Name *</label>
                            <input
                              type="text"
                              name="authorizedPersonName"
                              className={`form-control ${touched.authorizedPersonName && errors.authorizedPersonName ? 'border-rose-450' : ''}`}
                              placeholder="e.g. Jane Smith (Director)"
                              value={values.authorizedPersonName}
                              onChange={handleChange}
                              onBlur={handleBlur}
                            />
                            {touched.authorizedPersonName && errors.authorizedPersonName && (
                              <p className="text-rose-500 text-xs mt-1 font-bold">{errors.authorizedPersonName}</p>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Clinic Specific Form Fields */}
                    {providerCategory === 'clinic' && (
                      <>
                        <div className="form-group mb-0">
                          <label className="form-label">Clinic Name *</label>
                          <input
                            type="text"
                            name="clinicName"
                            className={`form-control ${touched.clinicName && errors.clinicName ? 'border-rose-450' : ''}`}
                            placeholder="e.g. Apex Health Clinic"
                            value={values.clinicName}
                            onChange={handleChange}
                            onBlur={handleBlur}
                          />
                          {touched.clinicName && errors.clinicName && (
                            <p className="text-rose-500 text-xs mt-1 font-bold">{errors.clinicName}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="form-group mb-0">
                            <label className="form-label">Clinic Registration Number *</label>
                            <input
                              type="text"
                              name="clinicRegNo"
                              className={`form-control ${touched.clinicRegNo && errors.clinicRegNo ? 'border-rose-450' : ''}`}
                              placeholder="e.g. CLN-445566"
                              value={values.clinicRegNo}
                              onChange={handleChange}
                              onBlur={handleBlur}
                            />
                            {touched.clinicRegNo && errors.clinicRegNo && (
                              <p className="text-rose-500 text-xs mt-1 font-bold">{errors.clinicRegNo}</p>
                            )}
                          </div>

                          <div className="form-group mb-0">
                            <label className="form-label">Authorized Person Name *</label>
                            <input
                              type="text"
                              name="authorizedPersonName"
                              className={`form-control ${touched.authorizedPersonName && errors.authorizedPersonName ? 'border-rose-450' : ''}`}
                              placeholder="e.g. Dr. Rayan G. (Lead Physician)"
                              value={values.authorizedPersonName}
                              onChange={handleChange}
                              onBlur={handleBlur}
                            />
                            {touched.authorizedPersonName && errors.authorizedPersonName && (
                              <p className="text-rose-500 text-xs mt-1 font-bold">{errors.authorizedPersonName}</p>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Pharmacy Specific Form Fields */}
                    {providerCategory === 'pharmacy' && (
                      <>
                        <div className="form-group mb-0">
                          <label className="form-label">Pharmacy Name *</label>
                          <input
                            type="text"
                            name="pharmacyName"
                            className={`form-control ${touched.pharmacyName && errors.pharmacyName ? 'border-rose-450' : ''}`}
                            placeholder="e.g. MedPlus Pharmacy"
                            value={values.pharmacyName}
                            onChange={handleChange}
                            onBlur={handleBlur}
                          />
                          {touched.pharmacyName && errors.pharmacyName && (
                            <p className="text-rose-500 text-xs mt-1 font-bold">{errors.pharmacyName}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="form-group mb-0">
                            <label className="form-label">Drug License Number *</label>
                            <input
                              type="text"
                              name="drugLicenseNo"
                              className={`form-control ${touched.drugLicenseNo && errors.drugLicenseNo ? 'border-rose-450' : ''}`}
                              placeholder="e.g. DL-992288"
                              value={values.drugLicenseNo}
                              onChange={handleChange}
                              onBlur={handleBlur}
                            />
                            {touched.drugLicenseNo && errors.drugLicenseNo && (
                              <p className="text-rose-500 text-xs mt-1 font-bold">{errors.drugLicenseNo}</p>
                            )}
                          </div>

                          <div className="form-group mb-0">
                            <label className="form-label">Authorized Person Name *</label>
                            <input
                              type="text"
                              name="authorizedPersonName"
                              className={`form-control ${touched.authorizedPersonName && errors.authorizedPersonName ? 'border-rose-450' : ''}`}
                              placeholder="e.g. Alex Carter (Store Manager)"
                              value={values.authorizedPersonName}
                              onChange={handleChange}
                              onBlur={handleBlur}
                            />
                            {touched.authorizedPersonName && errors.authorizedPersonName && (
                              <p className="text-rose-500 text-xs mt-1 font-bold">{errors.authorizedPersonName}</p>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Laboratory Specific Form Fields */}
                    {providerCategory === 'diagnostic' && (
                      <>
                        <div className="form-group mb-0">
                          <label className="form-label">Laboratory Name *</label>
                          <input
                            type="text"
                            name="laboratoryName"
                            className={`form-control ${touched.laboratoryName && errors.laboratoryName ? 'border-rose-450' : ''}`}
                            placeholder="e.g. City Diagnostic Laboratory"
                            value={values.laboratoryName}
                            onChange={handleChange}
                            onBlur={handleBlur}
                          />
                          {touched.laboratoryName && errors.laboratoryName && (
                            <p className="text-rose-500 text-xs mt-1 font-bold">{errors.laboratoryName}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="form-group mb-0">
                            <label className="form-label">Laboratory Registration Number *</label>
                            <input
                              type="text"
                              name="laboratoryRegNo"
                              className={`form-control ${touched.laboratoryRegNo && errors.laboratoryRegNo ? 'border-rose-450' : ''}`}
                              placeholder="e.g. LAB-112233"
                              value={values.laboratoryRegNo}
                              onChange={handleChange}
                              onBlur={handleBlur}
                            />
                            {touched.laboratoryRegNo && errors.laboratoryRegNo && (
                              <p className="text-rose-500 text-xs mt-1 font-bold">{errors.laboratoryRegNo}</p>
                            )}
                          </div>

                          <div className="form-group mb-0">
                            <label className="form-label">Authorized Person Name *</label>
                            <input
                              type="text"
                              name="authorizedPersonName"
                              className={`form-control ${touched.authorizedPersonName && errors.authorizedPersonName ? 'border-rose-450' : ''}`}
                              placeholder="e.g. Dr. Linda H. (Chief Pathologist)"
                              value={values.authorizedPersonName}
                              onChange={handleChange}
                              onBlur={handleBlur}
                            />
                            {touched.authorizedPersonName && errors.authorizedPersonName && (
                              <p className="text-rose-500 text-xs mt-1 font-bold">{errors.authorizedPersonName}</p>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Generic / Home Care / Ambulance / Equipment Specific Fields */}
                    {(providerCategory === 'homecare' || providerCategory === 'ambulance' || providerCategory === 'equipment') && (
                      <>
                        <div className="form-group mb-0">
                          <label className="form-label">Organization Name *</label>
                          <input
                            type="text"
                            name="organizationName"
                            className={`form-control ${touched.organizationName && errors.organizationName ? 'border-rose-450' : ''}`}
                            placeholder="e.g. Portea Home Care / Fast-Response Ambulance / Rent-A-Med"
                            value={values.organizationName}
                            onChange={handleChange}
                            onBlur={handleBlur}
                          />
                          {touched.organizationName && errors.organizationName && (
                            <p className="text-rose-500 text-xs mt-1 font-bold">{errors.organizationName}</p>
                          )}
                        </div>

                        <div className="form-group">
                          <label className="form-label">Authorized Person Name *</label>
                          <input
                            type="text"
                            name="authorizedPersonName"
                            className={`form-control ${touched.authorizedPersonName && errors.authorizedPersonName ? 'border-rose-450' : ''}`}
                            placeholder="e.g. Robert Miller (General Administrator)"
                            value={values.authorizedPersonName}
                            onChange={handleChange}
                            onBlur={handleBlur}
                          />
                          {touched.authorizedPersonName && errors.authorizedPersonName && (
                            <p className="text-rose-500 text-xs mt-1 font-bold">{errors.authorizedPersonName}</p>
                          )}
                        </div>
                      </>
                    )}

                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="btn bg-slate-100 hover:bg-slate-200 text-slate-700 w-1/3 py-3.5 font-bold"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary flex-1 py-3.5"
                      >
                        Continue
                      </button>
                    </div>
                  </Form>
                )}
              </Formik>
            </div>
          )}

          {/* Step 4: Review Screen */}
          {step === 4 && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-teal-600" />
                  Review Registration
                </h2>                <p className="text-slate-500 text-sm mt-1 font-medium">
                  Review all details before submitting your registration.
                </p>
              </div>

              {apiError && (
                <div className="p-4 mb-6 rounded-2xl bg-rose-50 border border-rose-150 text-rose-800 text-sm font-bold flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>{apiError}</span>
                </div>
              )}

              <div className="space-y-6 mb-6">
                {/* 1. Personal Info Section */}
                <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl relative">
                  <button
                    onClick={() => setStep(1)}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-teal-600 rounded-lg hover:bg-white border border-transparent hover:border-slate-150 transition-all"
                    title="Edit Personal Information"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6">
                    <div>
                      <span className="text-xs font-bold text-slate-400 block">Full Name</span>
                      <span className="text-sm font-semibold text-slate-800">{personalValues.fullName}</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 block">Mobile Number</span>
                      <span className="text-sm font-semibold text-slate-800">+91 {personalValues.mobileNumber}</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 block">Email Address</span>
                      <span className="text-sm font-semibold text-slate-800">{personalValues.emailAddress}</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 block">Date of Birth / Gender</span>
                      <span className="text-sm font-semibold text-slate-800">{personalValues.dob} / {personalValues.gender}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Provider Category Section */}
                <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl relative">
                  <button
                    onClick={() => setStep(2)}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-teal-600 rounded-lg hover:bg-white border border-transparent hover:border-slate-150 transition-all"
                    title="Edit Category"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    Provider Category
                  </h3>
                  <span className="inline-flex bg-teal-50 text-teal-800 text-xs font-black px-3.5 py-1.5 rounded-xl border border-teal-100 mt-1 uppercase tracking-wider">
                    {getCategoryLabel(providerCategory)}
                  </span>
                </div>

                {/* 3. Professional Info Section */}
                <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl relative">
                  <button
                    onClick={() => setStep(3)}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-teal-650 rounded-lg hover:bg-white border border-transparent hover:border-slate-150 transition-all"
                    title="Edit Professional Information"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                    Professional Details
                  </h3>

                  {providerCategory === 'doctor' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6">
                      <div>
                        <span className="text-xs font-bold text-slate-400 block">Medical Registration Number</span>
                        <span className="text-sm font-semibold text-slate-800">{step3Values.medicalRegNo}</span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-400 block">Qualification / Specialization</span>
                        <span className="text-sm font-semibold text-slate-800">{step3Values.qualification} ({step3Values.specialization})</span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-400 block">Years of Experience</span>
                        <span className="text-sm font-semibold text-slate-800">{step3Values.experience} Years</span>
                      </div>
                      {(step3Values.superSpecialization || step3Values.languagesKnown) && (
                        <div>
                          <span className="text-xs font-bold text-slate-400 block">Super Specialization / Languages</span>
                          <span className="text-sm font-semibold text-slate-800">
                            {step3Values.superSpecialization || '-'} / {step3Values.languagesKnown || '-'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {providerCategory === 'hospital' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6">
                      <div>
                        <span className="text-xs font-bold text-slate-400 block">Hospital Name</span>
                        <span className="text-sm font-semibold text-slate-800">{step3Values.hospitalName}</span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-400 block">Hospital Registration Number</span>
                        <span className="text-sm font-semibold text-slate-800">{step3Values.hospitalRegNo}</span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-400 block">Authorized Representative</span>
                        <span className="text-sm font-semibold text-slate-800">{step3Values.authorizedPersonName}</span>
                      </div>
                    </div>
                  )}

                  {providerCategory === 'clinic' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6">
                      <div>
                        <span className="text-xs font-bold text-slate-400 block">Clinic Name</span>
                        <span className="text-sm font-semibold text-slate-800">{step3Values.clinicName}</span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-400 block">Clinic Registration Number</span>
                        <span className="text-sm font-semibold text-slate-800">{step3Values.clinicRegNo}</span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-400 block">Authorized Representative</span>
                        <span className="text-sm font-semibold text-slate-800">{step3Values.authorizedPersonName}</span>
                      </div>
                    </div>
                  )}

                  {providerCategory === 'pharmacy' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6">
                      <div>
                        <span className="text-xs font-bold text-slate-400 block">Pharmacy Name</span>
                        <span className="text-sm font-semibold text-slate-800">{step3Values.pharmacyName}</span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-400 block">Drug License Number</span>
                        <span className="text-sm font-semibold text-slate-800">{step3Values.drugLicenseNo}</span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-400 block">Authorized Representative</span>
                        <span className="text-sm font-semibold text-slate-800">{step3Values.authorizedPersonName}</span>
                      </div>
                    </div>
                  )}

                  {providerCategory === 'diagnostic' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6">
                      <div>
                        <span className="text-xs font-bold text-slate-400 block">Laboratory Name</span>
                        <span className="text-sm font-semibold text-slate-800">{step3Values.laboratoryName}</span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-400 block">Laboratory Registration Number</span>
                        <span className="text-sm font-semibold text-slate-800">{step3Values.laboratoryRegNo}</span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-400 block">Authorized Representative</span>
                        <span className="text-sm font-semibold text-slate-800">{step3Values.authorizedPersonName}</span>
                      </div>
                    </div>
                  )}

                  {(providerCategory === 'homecare' || providerCategory === 'ambulance' || providerCategory === 'equipment') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6">
                      <div>
                        <span className="text-xs font-bold text-slate-400 block">Organization Name</span>
                        <span className="text-sm font-semibold text-slate-800">{step3Values.organizationName}</span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-400 block">Authorized Representative</span>
                        <span className="text-sm font-semibold text-slate-800">{step3Values.authorizedPersonName}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="btn bg-slate-100 hover:bg-slate-200 text-slate-700 w-1/3 py-3.5 font-bold"
                >
                  Back
                </button>
                 <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={async () => {
                    setIsSubmitting(true);
                    setApiError(null);

                    const categoryMap: Record<string, string> = {
                      doctor: 'doctor',
                      hospital: 'hospitalAdmin',
                      clinic: 'clinicOwner',
                      pharmacy: 'pharmacy',
                      diagnostic: 'diagnostic',
                      homecare: 'homecare',
                      ambulance: 'ambulance',
                      equipment: 'equipment'
                    };

                    const providerKey = categoryMap[providerCategory || ''] || 'doctor';
                    const provider_type_id = PROVIDER_TYPE_MAP[providerKey] || 5;

                    const payload = {
                      full_name: personalValues.fullName,
                      phone: personalValues.mobileNumber,
                      email: personalValues.emailAddress,
                      date_of_birth: personalValues.dob,
                      gender: personalValues.gender.toLowerCase(),
                      provider_type_id,
                      password: personalValues.password,
                      medicalRegNo: step3Values.medicalRegNo || undefined,
                      qualification: step3Values.qualification || undefined,
                      specialization: step3Values.specialization || undefined,
                      experience: step3Values.experience ? Number(step3Values.experience) : undefined,
                      superSpecialization: step3Values.superSpecialization || undefined,
                      languagesKnown: step3Values.languagesKnown || undefined,
                      hospitalName: step3Values.hospitalName || undefined,
                      hospitalRegNo: step3Values.hospitalRegNo || undefined,
                      authorizedPersonName: step3Values.authorizedPersonName || undefined,
                      clinicName: step3Values.clinicName || undefined,
                      clinicRegNo: step3Values.clinicRegNo || undefined,
                      pharmacyName: step3Values.pharmacyName || undefined,
                      drugLicenseNo: step3Values.drugLicenseNo || undefined,
                      laboratoryName: step3Values.laboratoryName || undefined,
                      laboratoryRegNo: step3Values.laboratoryRegNo || undefined,
                      organizationName: step3Values.organizationName || undefined,
                    };

                    try {
                      await registerProviderApi(payload);
                      setStep(5);
                    } catch (error: any) {
                      const msg = error.response?.data?.message || error.message || 'Registration failed. Please try again.';
                      setApiError(msg);
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  className="btn btn-primary flex-1 py-3.5 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Submitting...
                    </>
                  ) : (
                    'Submit Registration'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Registration Success Screen */}
          {step === 5 && (
            <div className="text-center animate-fade">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-teal-500/10 animate-ping"></div>
                  <span className="relative block p-4 rounded-full bg-teal-50 border border-teal-100 shadow-sm">
                    <CheckCircle2 className="w-16 h-16 text-teal-600" />
                  </span>
                </div>
              </div>

              <h2 className="text-3xl font-black text-slate-800">
                Welcome to Vizito!
              </h2>
              <p className="text-teal-600 font-bold text-lg mt-2">
                Your provider account has been created successfully.
              </p>

              <div className="max-w-md mx-auto">
                <p className="text-slate-500 mt-4 leading-relaxed text-sm font-medium">
                  You can now log in and complete your organization profile, verification documents, KYC, bank details, and other information from your Provider Workspace.
                </p>

                <div className="my-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 text-xs font-bold leading-relaxed flex items-start gap-2 text-left">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>Organization setup, KYC, bank details, profile completion, and verification are completed inside the workspace after your first login.</span>
                </div>

                <button
                  onClick={handleFinalSubmit}
                  className="btn btn-primary w-full py-4 shadow-lg shadow-teal-600/25 mt-2"
                >
                  Login to Workspace
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
