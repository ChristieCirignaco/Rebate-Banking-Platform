"use client";

import { useState } from "react";
import { Download, ExternalLink, ImageOff, Maximize2 } from "lucide-react";

import { EmptyState } from "@/components/admin/users/detail/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function ImageProofCard({
  imageUrl,
  productName,
}: {
  imageUrl?: string;
  productName: string;
}) {
  const [lightbox, setLightbox] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Image Proof</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {imageUrl ? (
          <>
            <button
              type="button"
              onClick={() => setLightbox(true)}
              className="focus-visible:ring-ring block overflow-hidden rounded-lg border focus-visible:ring-2 focus-visible:outline-none"
              aria-label="Open image full size"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={`${productName} proof`}
                className="bg-muted max-h-80 w-full object-contain"
              />
            </button>

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <a href={imageUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" />
                  View Full Size
                </a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href={imageUrl} download target="_blank" rel="noreferrer">
                  <Download className="size-4" />
                  Download Image
                </a>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLightbox(true)}
              >
                <Maximize2 className="size-4" />
                Fullscreen
              </Button>
            </div>

            <Dialog open={lightbox} onOpenChange={setLightbox}>
              <DialogContent className="sm:max-w-4xl">
                <DialogTitle className="sr-only">
                  {productName} image proof
                </DialogTitle>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={`${productName} proof`}
                  className="max-h-[80dvh] w-full rounded-md object-contain"
                />
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <EmptyState
            icon={ImageOff}
            title="No image proof"
            description="This submission has no image attached."
          />
        )}
      </CardContent>
    </Card>
  );
}
