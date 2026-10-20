import { NextResponse, connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createAppointment } from "@/lib/appointments";


export async function POST(req: Request) {
  await connection();
  try {
    const body = await req.json();
    const { name, email, phone, role, aumTier, date, time, notes, consultationType } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }

    // Default target date/time
    const tomorrow = new Date(Date.now() + 86400000);
    const chosenDate = date || tomorrow.toISOString().split("T")[0];
    const chosenTime = time || "11:00";
    const startDateTime = new Date(`${chosenDate}T${chosenTime}:00`);
    const endDateTime = new Date(startDateTime.getTime() + 30 * 60 * 1000);

    const callType = consultationType || (role === "CLIENT" ? "Client Portfolio Discovery Call" : "Advisory Platform Demo");
    const title = `${callType}: ${name.trim()} (${role || "Advisor"})`;
    const meetSlug = Math.random().toString(36).substring(2, 8);
    const meetingLink = `https://meet.google.com/uwp-demo-${meetSlug}`;

    const leadNotes = [
      `Lead Name: ${name.trim()}`,
      `Email: ${email.trim()}`,
      `Phone/WhatsApp: ${phone ? phone.trim() : "Not provided"}`,
      `User Role: ${role || "Advisor / MFD"}`,
      `Practice / Portfolio AUM Tier: ${aumTier || "Not specified"}`,
      notes ? `Topics / Inquiry: ${notes.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    // Retrieve active advisor or fallback
    const { data: advisorUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("role", "ADVISOR")
      .limit(1)
      .maybeSingle();

    const advisorId = advisorUser?.id || "c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a33";

    // Retrieve active client user for relation or fallback
    const { data: clientUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("role", "CLIENT")
      .limit(1)
      .maybeSingle();

    const clientId = clientUser?.id || "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";
    const tenantId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

    const appointment = await createAppointment({
      clientId,
      advisorId,
      tenantId,
      title,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      meetingLink,
      notes: leadNotes,
      scheduledBy: "CLIENT",
      status: "REQUESTED",
    });

    return NextResponse.json({
      success: true,
      message: `Thank you, ${name}! Your demo & discovery session has been scheduled. Our Senior Wealth Advisor will connect with you at your chosen slot.`,
      meetingDetails: {
        id: appointment.id,
        title,
        date: chosenDate,
        time: chosenTime,
        meetingLink,
      },
    });
  } catch (error: any) {
    console.error("Book demo error:", error);
    return NextResponse.json({ error: error.message || "Failed to schedule demo session." }, { status: 500 });
  }
}

