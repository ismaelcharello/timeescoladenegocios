import { saveMemberProfileRequest } from "@/lib/member-profile-api";

export async function POST(request: Request) {
  return saveMemberProfileRequest(request);
}
