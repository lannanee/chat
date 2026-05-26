import ChatWindowLayout from "@/components/chat/ChatWindowLayout";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import CallWindow from "@/components/call/CallWindow";
import IncomingCallBanner from "@/components/call/IncomingCallBanner";
import OutgoingCallOverlay from "@/components/call/OutgoingCallOverlay";

const ChatAppPage = () => {
  return (
    <SidebarProvider>
      <AppSidebar />

      <div className="flex h-screen w-full p-2">
        <ChatWindowLayout />
      </div>

      {/* Call Components */}
      <CallWindow />
      <IncomingCallBanner />
      <OutgoingCallOverlay />
    </SidebarProvider>
  );
};

export default ChatAppPage;
