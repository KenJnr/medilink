// app/doctor/appointments/[id]/page.tsx
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
  Phone,
  Mail,
  MapPin,
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock as ClockIcon,
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
  patient_id: string;
  patient: {
    full_name: string;
    email: string;
    phone: string;
    avatar_url: string | null;
  };
}

export default function DoctorAppointmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = params.id as string;
  const { user, userRole, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [appointment, setAppointment] = useState<AppointmentDetail | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

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
    setError("");

    try {
      // Fetch appointment with patient details
      const { data, error } = await supabase
        .from("appointments")
        .select(
          `
          *,
          patient_user:patient_id (
            full_name,
            email,
            phone,
            avatar_url
          )
        `,
        )
        .eq("id", appointmentId)
        .eq("doctor_id", user.id)
        .single();

      if (error) throw error;

      if (!data) {
        setAppointment(null);
        setLoading(false);
        return;
      }

      const patientUser = data.patient_user || {};

      const transformedData: AppointmentDetail = {
        ...data,
        patient: {
          full_name: patientUser.full_name || "Unknown",
          email: patientUser.email || "",
          phone: patientUser.phone || "",
          avatar_url: patientUser.avatar_url || null,
        },
      };

      setAppointment(transformedData);
    } catch (error) {
      console.error("Error fetching appointment:", error);
      setError("Failed to load appointment details");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!appointment) return;
    
    // Skip confirmation for cancel to avoid double confirm
    if (newStatus !== 'cancelled') {
      if (!confirm(`Are you sure you want to mark this appointment as ${newStatus}?`)) return;
    }

    setUpdating(true);
    setError("");

    try {
      console.log(`Updating appointment ${appointmentId} to status: ${newStatus}`);
      
      // Update the appointment status
      const { data, error } = await supabase
        .from("appointments")
        .update({ status: newStatus })
        .eq("id", appointmentId)
        .select();

      console.log("Update response:", { data, error });

      if (error) {
        console.error("Update error:", error);
        setError(`Failed to update: ${error.message}`);
        return;
      }

      // Verify the update by fetching the latest data
      const { data: verifyData, error: verifyError } = await supabase
        .from("appointments")
        .select("status")
        .eq("id", appointmentId)
        .single();

      console.log("Verification:", { verifyData, verifyError });

      if (!verifyError && verifyData) {
        // Update local state with the verified status
        setAppointment({ ...appointment, status: verifyData.status as any });
        console.log(`Successfully updated to: ${verifyData.status}`);
      } else {
        // Fallback: update local state optimistically
        setAppointment({ ...appointment, status: newStatus as any });
      }

    } catch (error: any) {
      console.error("Error updating appointment:", error);
      setError(error.message || "Failed to update appointment status. Please try again.");
    } finally {
      setUpdating(false);
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
        icon: ClockIcon,
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

  const getAvailableActions = (status: string) => {
    const actions: { label: string; value: string; className: string }[] = [];

    if (status === "pending_payment") {
      actions.push({
        label: "Confirm Appointment",
        value: "confirmed",
        className: "bg-green-600 hover:bg-green-700 text-white",
      });
    }
    if (status === "confirmed") {
      actions.push({
        label: "Mark as Completed",
        value: "completed",
        className: "bg-blue-600 hover:bg-blue-700 text-white",
      });
    }
    if (status === "pending_payment" || status === "confirmed") {
      actions.push({
        label: "Cancel Appointment",
        value: "cancelled",
        className: "bg-red-600 hover:bg-red-700 text-white",
      });
    }

    return actions;
  };

  const canStartCall = () => {
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
            href="/doctor/appointments"
            className="mt-4 inline-block text-blue-600 hover:underline"
          >
            ← Back to appointments
          </Link>
        </div>
      </div>
    );
  }

  const status = getStatusDisplay(appointment.status);
  const StatusIcon = status.icon;
  const date = new Date(appointment.starts_at);
  const availableActions = getAvailableActions(appointment.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/doctor" className="text-xl font-bold text-blue-600">
                MediLink
              </Link>
              <span className="ml-3 text-sm text-gray-400 hidden sm:inline">
                Appointment Details
              </span>
            </div>
            <Link
              href="/doctor/appointments"
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
                  {appointment.patient?.avatar_url ? (
                    <img
                      src={appointment.patient.avatar_url}
                      alt={appointment.patient.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    appointment.patient?.full_name?.charAt(0) || "P"
                  )}
                </div>
                <div>
                  <h1 className="text-xl font-bold">
                    {appointment.patient?.full_name || "Unknown Patient"}
                  </h1>
                  <p className="text-blue-100">Patient</p>
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

          <div className="p-6 space-y-6">
            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

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
                <p className="text-sm text-gray-500">Booked On</p>
                <p className="font-medium text-gray-900">
                  {new Date(appointment.created_at).toLocaleDateString(
                    "en-US",
                    {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    },
                  )}
                </p>
              </div>
            </div>

            {/* Patient Contact */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="font-medium text-gray-900 mb-2">
                Patient Contact
              </h3>
              <div className="space-y-1 text-sm">
                {appointment.patient?.email && (
                  <p className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4" />
                    {appointment.patient.email}
                  </p>
                )}
                {appointment.patient?.phone && (
                  <p className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4" />
                    {appointment.patient.phone}
                  </p>
                )}
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

            {/* Actions */}
            {availableActions.length > 0 && (
              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-medium text-gray-900 mb-3">
                  Update Status
                </h3>
                <div className="flex flex-wrap gap-3">
                  {availableActions.map((action) => (
                    <button
                      key={action.value}
                      onClick={() => handleUpdateStatus(action.value)}
                      disabled={updating}
                      className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-colors ${action.className} disabled:opacity-50`}
                    >
                      {updating ? "Updating..." : action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              {canStartCall() && user && (
                <VideoCallButton
                  appointmentId={appointment.id}
                  doctorId={user.id}
                  patientId={appointment.patient_id}
                  role="doctor"
                />
              )}

              {/* <Link
                href="/doctor/appointments"
                className="px-6 py-2.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back to Appointments
              </Link> */}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}