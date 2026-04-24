/**
 * Static option lists for the Create Simulation form filters.
 * Source of truth for Nemotron-USA dataset supported dimensions.
 *
 * Contract guardrail: these are the ONLY filter keys sent to the API.
 * Keys income_brackets, household_income, ethnicity are intentionally absent.
 */

// ── US States ─────────────────────────────────────────────────────────────────
export const US_STATES: { value: string; label: string }[] = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'District of Columbia' },
]

// ── Sex ───────────────────────────────────────────────────────────────────────
export const SEX_OPTIONS = [
  { value: 'Male',   label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other',  label: 'Other / Non-binary' },
]

// ── Marital status ────────────────────────────────────────────────────────────
export const MARITAL_STATUS_OPTIONS = [
  { value: 'never_married',       label: 'Never married' },
  { value: 'married',             label: 'Married' },
  { value: 'divorced_or_widowed', label: 'Divorced or widowed' },
  { value: 'separated',           label: 'Separated' },
  { value: 'domestic_partnership', label: 'Domestic partnership' },
]

// ── Education level ───────────────────────────────────────────────────────────
export const EDUCATION_LEVEL_OPTIONS = [
  { value: 'no_high_school',    label: 'No high school diploma' },
  { value: 'high_school',       label: 'High school diploma / GED' },
  { value: 'some_college',      label: 'Some college, no degree' },
  { value: 'associates',        label: "Associate's degree" },
  { value: 'bachelors',         label: "Bachelor's degree" },
  { value: 'graduate',          label: "Graduate degree (Master's / PhD)" },
]

// ── Occupations ───────────────────────────────────────────────────────────────
export const OCCUPATION_OPTIONS: { value: string; label: string }[] = [
  // Healthcare
  { value: 'Nurse',              label: 'Nurse' },
  { value: 'Physician',          label: 'Physician' },
  { value: 'Pharmacist',         label: 'Pharmacist' },
  { value: 'Medical Assistant',  label: 'Medical Assistant' },
  { value: 'Physical Therapist', label: 'Physical Therapist' },
  // Education
  { value: 'Teacher',            label: 'Teacher' },
  { value: 'Professor',          label: 'Professor' },
  { value: 'School Counselor',   label: 'School Counselor' },
  // Technology
  { value: 'Software Developer', label: 'Software Developer' },
  { value: 'Data Analyst',       label: 'Data Analyst' },
  { value: 'IT Support',         label: 'IT Support' },
  { value: 'Cybersecurity Analyst', label: 'Cybersecurity Analyst' },
  { value: 'UX Designer',        label: 'UX Designer' },
  // Finance
  { value: 'Accountant',         label: 'Accountant' },
  { value: 'Financial Advisor',  label: 'Financial Advisor' },
  { value: 'Bank Teller',        label: 'Bank Teller' },
  { value: 'Insurance Agent',    label: 'Insurance Agent' },
  // Retail & Service
  { value: 'Retail Worker',      label: 'Retail Worker' },
  { value: 'Restaurant Worker',  label: 'Restaurant Worker' },
  { value: 'Customer Service',   label: 'Customer Service' },
  { value: 'Delivery Driver',    label: 'Delivery Driver' },
  // Skilled trades
  { value: 'Electrician',        label: 'Electrician' },
  { value: 'Plumber',            label: 'Plumber' },
  { value: 'Construction Worker',label: 'Construction Worker' },
  { value: 'Mechanic',           label: 'Mechanic' },
  { value: 'Carpenter',          label: 'Carpenter' },
  // Government & Public
  { value: 'Police Officer',     label: 'Police Officer' },
  { value: 'Firefighter',        label: 'Firefighter' },
  { value: 'Social Worker',      label: 'Social Worker' },
  { value: 'Military',           label: 'Military / Veterans' },
  // Business
  { value: 'Manager',            label: 'Manager' },
  { value: 'Small Business Owner', label: 'Small Business Owner' },
  { value: 'Sales Representative', label: 'Sales Representative' },
  { value: 'HR Specialist',      label: 'HR Specialist' },
  // Other
  { value: 'Farmer',             label: 'Farmer' },
  { value: 'Artist',             label: 'Artist / Creative' },
  { value: 'Journalist',         label: 'Journalist' },
  { value: 'Lawyer',             label: 'Lawyer' },
  { value: 'Engineer',           label: 'Engineer (non-software)' },
  { value: 'Scientist',          label: 'Scientist / Researcher' },
  { value: 'Retired',            label: 'Retired' },
  { value: 'Student',            label: 'Student' },
  { value: 'Unemployed',         label: 'Unemployed / Job-seeking' },
  { value: 'Homemaker',          label: 'Homemaker' },
]

// ── Age range bounds ──────────────────────────────────────────────────────────
export const AGE_MIN = 18
export const AGE_MAX = 100

// ── Sample size bounds ────────────────────────────────────────────────────────
export const SAMPLE_MIN = 20
export const SAMPLE_MAX = 2000
export const SAMPLE_DEFAULT = 500
