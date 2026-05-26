import { useChatStore } from "@/stores/useChatStore";
import type { Conversation } from "@/types/chat";
import { SidebarTrigger } from "../ui/sidebar";
import { useAuthStore } from "@/stores/useAuthStore";
import { Separator } from "../ui/separator";
import UserAvatar from "./UserAvatar";
import StatusBadge from "./StatusBadge";
import GroupChatAvatar from "./GroupChatAvatar";
import { useSocketStore } from "@/stores/useSocketStore";
import CallButtons from "@/components/call/CallButtons";
//import AddGroupMembersModal from "./AddGroupMembersModal";

const ChatWindowHeader = ({ chat }: { chat?: Conversation }) => {
  const { conversations, activeConversationId } = useChatStore();
  const { user } = useAuthStore();
  const { onlineUsers } = useSocketStore();

  let otherUser;

  chat = chat ?? conversations.find((c) => c._id === activeConversationId);

  if (!chat) {
    return (
      <header className="md:hidden sticky top-0 z-10 flex items-center gap-2 px-4 py-2 w-full">
        <SidebarTrigger className="-ml-1 text-foreground" />
      </header>
    );
  }

  if (chat.type === "direct") {
    const otherUsers = chat.participants.filter((p) => p._id !== user?._id);
    otherUser = otherUsers.length > 0 ? otherUsers[0] : null;

    if (!user || !otherUser) return;
  }

  const isGroupCreator =
    chat.type === "group" &&
    chat.group?.createdBy?.toString() === user?._id?.toString();

  return (
    <header className="sticky top-0 z-10 px-4 py-2 flex items-center justify-between bg-background border-b">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1 text-foreground" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />

        <div className="p-2 flex items-center gap-3">
          {/* avatar */}
          <div className="relative">
            {chat.type === "direct" ? (
              <>
                <UserAvatar
                  type={"sidebar"}
                  name={otherUser?.displayName || "Camiu"}
                  avatarUrl={otherUser?.avatarUrl || undefined}
                />
                <StatusBadge
                  status={
                    onlineUsers.includes(otherUser?._id ?? "") ? "online" : "offline"
                  }
                />
              </>
            ) : (
              <GroupChatAvatar
                participants={chat.participants}
                type="sidebar"
              />
            )}
          </div>

          {/* name */}
          <h2 className="font-semibold text-foreground">
            {chat.type === "direct" ? otherUser?.displayName : chat.group?.name}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* Nút thêm thành viên — chỉ hiện với người tạo nhóm */}
        {isGroupCreator && <AddGroupMembersModal conversation={chat} />}

        {/* Call buttons */}
        <CallButtons chat={chat} />
      </div>
    </header>
  );
};

export default ChatWindowHeader;