import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserTableRow } from "./user-table-row";
import type { AdminUser } from "./types";

export function UsersTable({
  users,
  canDelete,
}: {
  users: AdminUser[];
  canDelete: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name / Username</TableHead>
          <TableHead>Email / Status</TableHead>
          <TableHead>KYC Info</TableHead>
          <TableHead>Joined At</TableHead>
          <TableHead>Code Used</TableHead>
          <TableHead>Last Login</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={7}
              className="text-muted-foreground h-24 text-center"
            >
              No users match your filters.
            </TableCell>
          </TableRow>
        ) : (
          users.map((user) => (
            <UserTableRow key={user.id} user={user} canDelete={canDelete} />
          ))
        )}
      </TableBody>
    </Table>
  );
}
