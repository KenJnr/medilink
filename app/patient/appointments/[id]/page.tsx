// app/patient/appointments/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import {
  Calendar,
  Clock,
  User,
  MapPin,
  Phone,
  Mail,
  ArrowLeft,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import VideoCallButton from "@/components/video/VideoCallButton";

interface AppointmentDetail {
  id: string;
  starts_at: string;
  ends_at: string;
  status:
    | "pending_payment"
    | "payment_processing"
    | "confirmed"
    | "completed"
    | "cancelled"
    | "expired"
    | "payment_failed";
  consultation_type: string;
  fee: number;
  currency: string;
  reason: string;
  notes: string;
  created_at: string;
  doctor_id: string;
  doctor: {
    full_name: string;
    email: string;
    phone: string;
    avatar_url: string | null;
    specialty: string;
    specialty_description: string;
    location: string;
    consultation_fee: number;
    consultation_type: string;
  };
}

export default function AppointmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = params.id as string;
  const { user, userRole, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [appointment, setAppointment] = useState<AppointmentDetail | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (user) {
      fetchAppointment();
    }
  }, [user, authLoading, appointmentId]);

  const fetchAppointment = async () => {
    if (!user) return;

    setLoading(true);

    try {
      // Step 1: Fetch appointment with doctor user data
      const { data: appointmentData, error: appointmentError } = await supabase
        .from("appointments")
        .select(
          `
          *,
          doctor_user:doctor_id (
            full_name,
            email,
            phone,
            avatar_url
          )
        `,
        )
        .eq("id", appointmentId)
        .eq("patient_id", user.id)
        .single();

      if (appointmentError) throw appointmentError;

      if (!appointmentData) {
        setAppointment(null);
        setLoading(false);
        return;
      }

      // Step 2: Get doctor profile
      const { data: doctorProfile, error: profileError } = await supabase
        .from("doctor_profiles")
        .select(
          `
          user_id,
          location,
          consultation_fee,
          currency,
          consultation_type,
          specialty_id
        `,
        )
        .eq("user_id", appointmentData.doctor_id)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        console.error("Error fetching doctor profile:", profileError);
      }

      // Step 3: Get specialty name
      let specialtyName = "General Medicine";
      let specialtyDescription = "";

      if (doctorProfile?.specialty_id) {
        const { data: specialty, error: specialtyError } = await supabase
          .from("specialties")
          .select("name, description")
          .eq("id", doctorProfile.specialty_id)
          .single();

        if (!specialtyError && specialty) {
          specialtyName = specialty.name || "General Medicine";
          specialtyDescription = specialty.description || "";
        }
      }

      // Step 4: Combine the data
      const doctorUser = appointmentData.doctor_user || {};
      const transformedData: AppointmentDetail = {
        ...appointmentData,
        doctor: {
          full_name: doctorUser.full_name || "Unknown",
          email: doctorUser.email || "",
          phone: doctorUser.phone || "",
          avatar_url: doctorUser.avatar_url || null,
          specialty: specialtyName,
          specialty_description: specialtyDescription,
          location: doctorProfile?.location || "",
          consultation_fee: doctorProfile?.consultation_fee || 0,
          consultation_type: doctorProfile?.consultation_type || "in_person",
        },
      };

      setAppointment(transformedData);
    } catch (error) {
      console.error("Error fetching appointment:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;

    setCancelling(true);

    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", appointmentId);

      if (error) throw error;

      setAppointment(
        appointment ? { ...appointment, status: "cancelled" } : null,
      );
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      alert("Failed to cancel appointment. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  const getStatusDisplay = (status: string) => {
    const configs: Record<
      string,
      { icon: any; label: string; className: string }
    > = {
      confirmed: {
        icon: CheckCircle,
        label: "Confirmed",
        className: "bg-green-100 text-green-700 border border-green-200",
      },
      pending_payment: {
        icon: AlertCircle,
        label: "Pending Payment",
        className: "bg-yellow-100 text-yellow-700 border border-yellow-200",
      },
      payment_processing: {
        icon: Clock,
        label: "Processing",
        className: "bg-blue-100 text-blue-700 border border-blue-200",
      },
      completed: {
        icon: CheckCircle,
        label: "Completed",
        className: "bg-gray-100 text-gray-700 border border-gray-200",
      },
      cancelled: {
        icon: XCircle,
        label: "Cancelled",
        className: "bg-red-100 text-red-700 border border-red-200",
      },
      expired: {
        icon: XCircle,
        label: "Expired",
        className: "bg-gray-100 text-gray-500 border border-gray-200",
      },
      payment_failed: {
        icon: XCircle,
        label: "Payment Failed",
        className: "bg-red-100 text-red-700 border border-red-200",
      },
    };
    return configs[status] || configs.pending_payment;
  };

  const canCancel = () => {
    return (
      appointment?.status === "pending_payment" ||
      appointment?.status === "confirmed"
    );
  };

  const canPay = () => {
    return appointment?.status === "pending_payment";
  };

  const canReschedule = () => {
    return (
      appointment?.status === "confirmed" ||
      appointment?.status === "pending_payment"
    );
  };

  const canJoinCall = () => {
    return appointment?.status === "confirmed";
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-400 text-sm">
            Loading appointment details...
          </p>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Appointment not found
          </h1>
          <Link
            href="/patient/appointments"
            className="mt-4 inline-block text-blue-600 hover:underline"
          >
            ← Back to appointments
          </Link>
        </div>
      </div>
    );
  }

  const date = new Date(appointment.starts_at);
  const status = getStatusDisplay(appointment.status);
  const StatusIcon = status.icon;
  const doctor = appointment.doctor;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-blue-600">
                MediLink
              </Link>
              <span className="ml-3 text-sm text-gray-400 hidden sm:inline">
                Appointment Details
              </span>
            </div>
            <Link
              href="/patient/appointments"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Back
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-linear-to-r from-blue-600 to-blue-700 px-6 py-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl text-white overflow-hidden">
                  {doctor?.avatar_url ? (
                    <img
                      src={doctor.avatar_url}
                      alt={doctor.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    doctor?.full_name?.charAt(0) || "D"
                  )}
                </div>
                <div>
                  <h1 className="text-xl font-bold">
                    Dr. {doctor?.full_name || "Unknown"}
                  </h1>
                  <p className="text-blue-100">
                    {doctor?.specialty || "General Medicine"}
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium ${status.className}`}
              >
                <StatusIcon className="w-4 h-4" />
                {status.label}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Appointment Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Date & Time</p>
                <p className="font-medium text-gray-900">
                  {date.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <p className="text-gray-600">
                  {date.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Consultation Type</p>
                <p className="font-medium text-gray-900 capitalize">
                  {appointment.consultation_type?.replace("_", " ") ||
                    "In-Person"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Fee</p>
                <p className="font-medium text-gray-900">
                  {appointment.currency} {appointment.fee}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="font-medium text-gray-900">
                  {doctor?.location || "Not specified"}
                </p>
              </div>
            </div>

            {/* Reason */}
            {appointment.reason && (
              <div>
                <p className="text-sm text-gray-500">Reason for Visit</p>
                <p className="text-gray-900">{appointment.reason}</p>
              </div>
            )}

            {/* Notes */}
            {appointment.notes && (
              <div>
                <p className="text-sm text-gray-500">Additional Notes</p>
                <p className="text-gray-900">{appointment.notes}</p>
              </div>
            )}

            {/* Doctor Contact */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="font-medium text-gray-900 mb-2">
                Doctor's Contact
              </h3>
              <div className="space-y-1 text-sm">
                {doctor?.email && (
                  <p className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4" />
                    {doctor.email}
                  </p>
                )}
                {doctor?.phone && (
                  <p className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4" />
                    {doctor.phone}
                  </p>
                )}
                {doctor?.location && (
                  <p className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    {doctor.location}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
              {canPay() && (
                <Link
                  href={`/patient/payments`}
                  className="px-6 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Pay Now
                </Link>
              )}

              {canReschedule() && (
                <Link
                  href={`/patient/appointments/${appointment.id}/reschedule`}
                  className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Reschedule
                </Link>
              )}

              {canJoinCall() && user && (
                <VideoCallButton
                  appointmentId={appointment.id}
                  doctorId={appointment.doctor_id}
                  patientId={user.id}
                  role="patient"
                />
              )}

              {canCancel() && (
                <button
                  onClick={handleCancelAppointment}
                  disabled={cancelling}
                  className="px-6 py-2.5 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {cancelling ? "Cancelling..." : "Cancel Appointment"}
                </button>
              )}
              {/* <Link
                href="/patient/appointments"
                className="px-6 py-2.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back to Appointments
              </Link> */}
            </div>

            {/* Booking Date */}
            <div className="text-xs text-gray-400">
              Booked on{" "}
              {new Date(appointment.created_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}