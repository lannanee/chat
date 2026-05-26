import { useState, useEffect } from "react";
import { UserPlus, Check, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import UserAvatar from "./UserAvatar";
import type { Conversation, Participant } from "@/types/chat";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

interface Friend {
  _id: string;
  displayName: string;
  avatarUrl?: string | null;
}

interface Props {
  conversation: Conversation;
}

const AddGroupMembersModal = ({ conversation }: Props) => {
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setSelected([]);
    setSuccess(false);

    axios
      .get(`${API_URL}/friends`, { withCredentials: true })
      .then((res) => {
        const existingIds = new Set(
          conversation.participants.map((p: Participant) => p._id)
        );
        const available = (res.data.friends ?? res.data).filter(
          (f: Friend) => !existingIds.has(f._id)
        );
        setFriends(available);
      })
      .catch(() => setError("Cannot load friends list."))
      .finally(() => setLoading(false));
  }, [open, conversation.participants]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (selected.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await axios.post(
        `${API_URL}/conversations/${conversation._id}/members`,
        { memberIds: selected },
        { withCredentials: true }
      );
      setSuccess(true);
      setTimeout(() => setOpen(false), 1000);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to add members.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          title="Add members"
        >
          <UserPlus className="w-5 h-5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add group members</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive text-center py-4">{error}</p>
        ) : friends.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No friends available to add.
          </p>
        ) : (
          <>
            <div className="max-h-72 overflow-y-auto pr-1">
              <ul className="space-y-1">
                {friends.map((friend) => {
                  const isSelected = selected.includes(friend._id);
                  return (
                    <li
                      key={friend._id}
                      onClick={() => toggle(friend._id)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <UserAvatar
                        type="sidebar"
                        name={friend.displayName}
                        avatarUrl={friend.avatarUrl ?? undefined}
                      />
                      <span className="flex-1 text-sm font-medium">
                        {friend.displayName}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-primary" />}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={selected.length === 0 || submitting || success}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : success ? (
                  <Check className="w-4 h-4 mr-2" />
                ) : null}
                {success ? "Done!" : `Add${selected.length > 0 ? ` (${selected.length})` : ""}`}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddGroupMembersModal;