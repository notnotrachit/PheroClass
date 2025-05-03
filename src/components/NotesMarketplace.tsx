import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  getApprovedNotes,
  getNoteDetails,
  purchaseNote,
  hasPurchasedNote,
} from "@/lib/contractService";
import { useWalletContext } from "@/context/WalletContext";
import {
  FileText,
  Download,
  Tag,
  User,
  Calendar,
  Loader2,
  BookOpen,
} from "lucide-react";

interface NotesMarketplaceProps {
  notesContractAddress: string;
  selectedLectureId?: number;
}

interface NoteDetails {
  id: number;
  title: string;
  description: string;
  ipfsHash: string;
  creator: string;
  price: string;
  createdAt: number;
  lectureId: number;
  isApproved: boolean;
  salesCount: number;
  purchased?: boolean;
}

export function NotesMarketplace({
  notesContractAddress,
  selectedLectureId,
}: NotesMarketplaceProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [notes, setNotes] = useState<NoteDetails[]>([]);
  const [purchasing, setPurchasing] = useState<Record<number, boolean>>({});

  const { provider, address } = useWalletContext();
  const { toast } = useToast();

  useEffect(() => {
    if (notesContractAddress) {
      fetchNotes();
    }
  }, [notesContractAddress, selectedLectureId]);

  const fetchNotes = async () => {
    try {
      setIsLoading(true);

      // Get approved notes
      const noteIds = await getApprovedNotes(notesContractAddress, provider);
      // console.log('Approved note IDs:', noteIds);

      // Get details for each note
      const notesData = await Promise.all(
        noteIds.map(async (id) => {
          const details = await getNoteDetails(
            notesContractAddress,
            id,
            provider
          );
          console.log("Note details:", details);

          // Check if user has purchased this note already
          const purchased = await hasPurchasedNote(
            notesContractAddress,
            id,
            address,
            provider
          );

          return {
            ...details,
            purchased,
          };
        })
      );

      // Filter by lecture if needed
      const filteredNotes = selectedLectureId
        ? notesData.filter((note) => note.lectureId === selectedLectureId)
        : notesData;

      setNotes(filteredNotes);
    } catch (error) {
      console.error("Error fetching notes:", error);
      toast({
        title: "Error",
        description: "Failed to load notes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async (note: NoteDetails) => {
    try {
      setPurchasing((prev) => ({ ...prev, [note.id]: true }));
      console.log("Purchasing note:", note);

      await purchaseNote(
        notesContractAddress,
        note.id,
        note.price, // This won't be used but kept for interface compatibility
        provider
      );

      toast({
        title: "Success!",
        description: `You have purchased "${note.title}"`,
      });

      // Refresh notes to update purchased status
      await fetchNotes();
    } catch (error) {
      console.error("Error purchasing note:", error);
      toast({
        title: "Purchase failed",
        description:
          "There was an error purchasing the note. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPurchasing((prev) => ({ ...prev, [note.id]: false }));
    }
  };

  const handleViewNote = (note: NoteDetails) => {
    // Open the PDF in a new tab using IPFS gateway
    window.open(`https://ipfs.io/ipfs/${note.ipfsHash}`, "_blank");
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12 text-gray-300">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        <span className="ml-2">Loading notes...</span>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-900/50 backdrop-blur-sm rounded-lg border border-dashed border-gray-700">
        <FileText className="h-12 w-12 mx-auto text-gray-500 mb-2" />
        <h3 className="mt-4 text-lg font-medium text-indigo-300">
          No notes available
        </h3>
        <p className="mt-2 text-sm text-gray-400">
          {selectedLectureId
            ? "There are no approved notes for this lecture yet."
            : "There are no approved notes available yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {notes.map((note) => (
        <Card
          key={note.id}
          className="overflow-hidden bg-gray-900/70 backdrop-blur-sm border border-gray-700 shadow-md hover:shadow-indigo-500/5 transition-shadow"
        >
          <CardHeader className="pb-2 bg-gray-800/50 border-b border-gray-700">
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg text-indigo-300">
                {note.title}
              </CardTitle>
              <Badge
                variant={note.purchased ? "secondary" : "default"}
                className={
                  note.purchased
                    ? "bg-green-900/50 text-green-300 border border-green-700/50"
                    : "bg-indigo-900/50 text-indigo-300 border border-indigo-600/50"
                }
              >
                {note.purchased ? "Purchased" : `${note.price} EDU`}
              </Badge>
            </div>
            <CardDescription className="text-gray-400">
              {note.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="pb-2 pt-4">
            <div className="space-y-3 text-sm">
              <div className="flex items-center text-gray-400">
                <User className="h-4 w-4 mr-1 text-indigo-400" />
                <span>Created by: {truncateAddress(note.creator)}</span>
              </div>

              <div className="flex items-center text-gray-400">
                <Calendar className="h-4 w-4 mr-1 text-indigo-400" />
                <span>Date: {formatDate(note.createdAt)}</span>
              </div>

              <div className="flex items-center text-gray-400">
                <BookOpen className="h-4 w-4 mr-1 text-indigo-400" />
                <span>Lecture ID: {note.lectureId}</span>
              </div>

              <div className="flex items-center text-gray-400">
                <Tag className="h-4 w-4 mr-1 text-indigo-400" />
                <span>Sales: {note.salesCount}</span>
              </div>
            </div>
          </CardContent>

          <CardFooter className="pt-4 border-t border-gray-700/50">
            {note.purchased ? (
              <Button
                className="w-full border-indigo-700 bg-indigo-900/30 text-indigo-300 hover:bg-indigo-800/50"
                variant="outline"
                onClick={() => handleViewNote(note)}
              >
                <Download className="mr-2 h-4 w-4" /> View Notes
              </Button>
            ) : (
              <Button
                className={`w-full ${
                  purchasing[note.id]
                    ? "bg-gray-700"
                    : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                } text-white`}
                onClick={() => handlePurchase(note)}
                disabled={purchasing[note.id]}
              >
                {purchasing[note.id] ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                    Purchasing...
                  </>
                ) : (
                  <>
                    <Tag className="mr-2 h-4 w-4" /> Purchase ({note.price} EDU)
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

export default NotesMarketplace;
