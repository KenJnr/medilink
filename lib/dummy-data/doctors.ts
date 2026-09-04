// lib/dummy-data/doctors.ts

export interface DummyDoctor {
  id: string
  full_name: string
  specialty_name: string
  consultation_fee: number
  currency: string
  location: string
  experience_years: number
  bio: string
  qualifications: string[]
  consultation_type: string
  rating: number
  profile_image?: string
}

export const dummyDoctors: DummyDoctor[] = [
  {
    id: '1',
    full_name: 'Sarah Mensah',
    specialty_name: 'Cardiology',
    consultation_fee: 350,
    currency: 'GHS',
    location: 'Accra, Ghana',
    experience_years: 12,
    bio: 'Dr. Sarah Mensah is a board-certified cardiologist with over 12 years of experience in diagnosing and treating heart conditions. She specializes in preventive cardiology and heart disease management.',
    qualifications: ['MBChB (University of Ghana)', 'Fellowship in Cardiology (South Africa)', 'MSc in Cardiovascular Medicine (UK)'],
    consultation_type: 'in_person',
    rating: 4.9
  },
  {
    id: '2',
    full_name: 'James Osei',
    specialty_name: 'Dermatology',
    consultation_fee: 250,
    currency: 'GHS',
    location: 'Kumasi, Ghana',
    experience_years: 8,
    bio: 'Dr. James Osei is a specialist in dermatology with expertise in skin cancer screening, acne treatment, and cosmetic dermatology. He is dedicated to helping patients achieve healthy skin.',
    qualifications: ['MBChB (KNUST)', 'Fellowship in Dermatology (Nigeria)', 'Diploma in Dermatology (UK)'],
    consultation_type: 'both',
    rating: 4.7
  },
  {
    id: '3',
    full_name: 'Ama Asare',
    specialty_name: 'Pediatrics',
    consultation_fee: 200,
    currency: 'GHS',
    location: 'Accra, Ghana',
    experience_years: 10,
    bio: 'Dr. Ama Asare is a compassionate pediatrician with a focus on children\'s health and development. She provides comprehensive care for children from birth through adolescence.',
    qualifications: ['MBChB (University of Ghana)', 'Fellowship in Pediatrics (South Africa)', 'Neonatal Resuscitation Certification'],
    consultation_type: 'in_person',
    rating: 4.8
  },
  {
    id: '4',
    full_name: 'Kwame Addo',
    specialty_name: 'Neurology',
    consultation_fee: 400,
    currency: 'GHS',
    location: 'Tema, Ghana',
    experience_years: 15,
    bio: 'Dr. Kwame Addo is a leading neurologist with expertise in stroke management, epilepsy, and movement disorders. He is committed to providing advanced neurological care.',
    qualifications: ['MBChB (University of Ghana)', 'Fellowship in Neurology (USA)', 'MSc in Clinical Neuroscience (UK)'],
    consultation_type: 'both',
    rating: 4.9
  },
  {
    id: '5',
    full_name: 'Esi Boateng',
    specialty_name: 'Gynecology',
    consultation_fee: 300,
    currency: 'GHS',
    location: 'Accra, Ghana',
    experience_years: 9,
    bio: 'Dr. Esi Boateng is a dedicated gynecologist providing comprehensive women\'s health services. She specializes in reproductive health, pregnancy care, and minimally invasive surgery.',
    qualifications: ['MBChB (University of Ghana)', 'Fellowship in Obstetrics & Gynecology (South Africa)', 'Minimally Invasive Surgery Certification'],
    consultation_type: 'in_person',
    rating: 4.6
  },
  {
    id: '6',
    full_name: 'Michael Kwarteng',
    specialty_name: 'Dentistry',
    consultation_fee: 180,
    currency: 'GHS',
    location: 'Kumasi, Ghana',
    experience_years: 6,
    bio: 'Dr. Michael Kwarteng is an experienced dentist offering comprehensive dental care including preventive, restorative, and cosmetic dentistry. He is passionate about creating beautiful smiles.',
    qualifications: ['BDS (KNUST)', 'Advanced Training in Cosmetic Dentistry (UK)', 'Invisalign Certification'],
    consultation_type: 'in_person',
    rating: 4.5
  },
  {
    id: '7',
    full_name: 'Nana Yeboah',
    specialty_name: 'General Medicine',
    consultation_fee: 150,
    currency: 'GHS',
    location: 'Tema, Ghana',
    experience_years: 7,
    bio: 'Dr. Nana Yeboah is a compassionate general practitioner providing primary care services for patients of all ages. He focuses on preventive medicine and chronic disease management.',
    qualifications: ['MBChB (University of Ghana)', 'Fellowship in Family Medicine (Nigeria)', 'Advanced Cardiac Life Support Certification'],
    consultation_type: 'in_person',
    rating: 4.4
  }
]

export const dummySpecialties = [
  { id: '1', name: 'Cardiology' },
  { id: '2', name: 'Dermatology' },
  { id: '3', name: 'Pediatrics' },
  { id: '4', name: 'Neurology' },
  { id: '5', name: 'Gynecology' },
  { id: '6', name: 'Dentistry' },
  { id: '7', name: 'General Medicine' },
  { id: '8', name: 'Orthopedics' },
  { id: '9', name: 'Ophthalmology' },
  { id: '10', name: 'Psychiatry' },
]