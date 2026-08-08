import React from "react";
import { useLocalSearchParams } from "expo-router";
import { ConversationChat } from "../../../src/components/ConversationChat";

export default function OwnerChat() {
  const { convoId, title } = useLocalSearchParams<{ convoId: string; title?: string }>();
  return <ConversationChat convoId={convoId} title={title} />;
}
