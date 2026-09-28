"use client";

import { useCallback, useEffect, useState } from "react";
import { Users, MessageSquare, Flag, Plus, ArrowLeft } from "lucide-react";
import { communityApi, ApiError, fmtDate } from "@/lib/api";
import { Card, CardHeader, CardBody, Button, Field, TextInput, TextArea, Skeleton, EmptyState, ErrorState, Badge } from "@/components/ui";
import { PageHeader } from "@/components/layout";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function CommunityPage() {
  const [posts, setPosts] = useState<any[] | null>(null);
  const [thread, setThread] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState("");

  const load = useCallback(async () => {
    try {
      const res: any = await communityApi.posts();
      setPosts(res.posts ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load posts.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openThread = async (id: string) => {
    try {
      const res: any = await communityApi.thread(id);
      setThread(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not open the post.");
    }
  };

  const submitPost = async () => {
    setBusy(true);
    setError(null);
    try {
      await communityApi.createPost(title, body);
      setTitle("");
      setBody("");
      setComposing(false);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not post.");
    } finally {
      setBusy(false);
    }
  };

  const submitComment = async () => {
    if (!thread) return;
    setBusy(true);
    try {
      await communityApi.comment(thread.post.id, comment);
      setComment("");
      await openThread(thread.post.id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not comment.");
    } finally {
      setBusy(false);
    }
  };

  if (thread) {
    return (
      <div>
        <button onClick={() => setThread(null)} className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-inksoft hover:text-leaf">
          <ArrowLeft size={13} /> Back to all posts
        </button>
        <Card className="animate-rise">
          <CardHeader title={thread.post.title} sub={`${thread.post.author} · ${fmtDate(thread.post.createdAt)}`} icon={<Users size={16} />} />
          <CardBody>
            <p className="text-[14px] leading-relaxed">{thread.post.body}</p>
            <div className="mt-5 border-t border-linesoft pt-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-inkfaint">{thread.comments.length} comments</p>
              <ul className="space-y-3">
                {thread.comments.map((c: any) => (
                  <li key={c.id} className="rounded-lg bg-husk px-3.5 py-2.5">
                    <p className="text-xs font-bold">{c.author} <span className="font-normal text-inkfaint">· {fmtDate(c.createdAt)}</span></p>
                    <p className="mt-1 text-[13px] leading-relaxed">{c.body}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex gap-2">
                <TextInput value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a helpful reply…" />
                <Button onClick={submitComment} busy={busy}>Reply</Button>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        kicker="Community"
        title="Farmer knowledge exchange"
        sub="Share what is working in your fields. Keep it respectful — posts can be reported and reviewed."
        right={
          <Button onClick={() => setComposing((c) => !c)}>
            <Plus size={15} /> New post
          </Button>
        }
      />

      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      {composing && (
        <Card className="mb-5 animate-rise">
          <CardHeader title="Write a post" />
          <CardBody>
            <div className="space-y-3">
              <Field label="Title"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Which wheat variety for late sowing?" /></Field>
              <Field label="Details"><TextArea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share context: district, soil, season…" /></Field>
              <div className="flex gap-2">
                <Button onClick={submitPost} busy={busy}>Publish</Button>
                <Button variant="ghost" onClick={() => setComposing(false)}>Cancel</Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {!posts && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Card key={i}><CardBody><Skeleton className="h-16 w-full" /></CardBody></Card>)}
        </div>
      )}

      {posts && posts.length === 0 && (
        <EmptyState title="No posts yet" sub="Start the conversation — ask about varieties, prices, or pest pressure in your area." />
      )}

      <div className="space-y-3">
        {posts?.map((p: any) => (
          <Card key={p.id} className="animate-rise">
            <CardBody className="py-4">
              <div className="flex items-start justify-between gap-3">
                <button onClick={() => openThread(p.id)} className="text-left">
                  <p className="font-display text-[16px] font-bold hover:text-leaf">{p.title}</p>
                  <p className="mt-1 line-clamp-2 max-w-3xl text-[13px] leading-relaxed text-inksoft">{p.body}</p>
                </button>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="flex items-center gap-1 text-xs font-bold text-inksoft">
                    <MessageSquare size={13} /> {p.commentCount}
                  </span>
                  <button
                    onClick={async () => {
                      try {
                        await communityApi.report(p.id);
                        alert("Thanks — this post was reported for review.");
                      } catch {
                        alert("You can't report this post.");
                      }
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-inkfaint hover:text-clay"
                    title="Report post"
                  >
                    <Flag size={11} /> Report
                  </button>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2 text-[11px] text-inkfaint">
                <Badge tone="green">{p.author}</Badge>
                {fmtDate(p.createdAt)}
                {p.reports > 0 && <Badge tone="clay">{p.reports} report(s)</Badge>}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
