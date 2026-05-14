"use client";

import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { addCommentToCR } from "@/app/(app)/actions/comments";

export function CommentForm({
  changeRequestId,
}: {
  changeRequestId: string;
}) {
  const ref = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={ref}
      action={async (formData) => {
        await addCommentToCR(formData);
        ref.current?.reset();
      }}
      className="flex flex-col gap-2"
    >
      <input
        type="hidden"
        name="changeRequestId"
        value={changeRequestId}
      />
      <Textarea
        name="body"
        rows={3}
        placeholder="Leave a comment for the author or reviewers…"
        maxLength={4000}
        required
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm">
          Post comment
        </Button>
      </div>
    </form>
  );
}
