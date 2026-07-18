import { setCareRequestStatus } from "./actions";

export function PendingRequests({ requests }: { requests: Array<{ id: string; patientName: string }> }) {
  if (requests.length === 0) return null;
  return <section className="rounded-lg border border-amber-200 bg-amber-50 p-5"><h2 className="text-lg font-semibold text-amber-950">Pending connection requests</h2><div className="mt-4 space-y-3">{requests.map((request) => <div className="flex flex-col gap-3 rounded-md bg-white p-4 sm:flex-row sm:items-center sm:justify-between" key={request.id}><p className="font-semibold">{request.patientName}</p><div className="flex gap-2"><form action={setCareRequestStatus.bind(null, request.id, true)}><button className="rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white" type="submit">Accept</button></form><form action={setCareRequestStatus.bind(null, request.id, false)}><button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold" type="submit">Decline</button></form></div></div>)}</div></section>;
}
