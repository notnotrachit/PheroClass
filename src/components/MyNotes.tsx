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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import {
  getCreatedNotes,
  getPurchasedNotes,
  getNoteDetails,
  updateNotePrice,
  getNoteSales,
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
  Edit,
  Save,
} from "lucide-react";

interface MyNotesProps {
  notesContractAddress: string;
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
}

export function MyNotes({ notesContractAddress }: MyNotesProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [createdNotes, setCreatedNotes] = useState<NoteDetails[]>([]);
  const [purchasedNotes, setPurchasedNotes] = useState<NoteDetails[]>([]);
  const [activeTab, setActiveTab] = useState("created");
  const [editingPrice, setEditingPrice] = useState<Record<number, boolean>>({});
  const [newPrices, setNewPrices] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});

  const { provider, address } = useWalletContext();
  const { toast } = useToast();

  useEffect(() => {
    if (notesContractAddress && address) {
      fetchNotes();
    }
  }, [notesContractAddress, address]);

  const fetchNotes = async () => {
    try {
      setIsLoading(true);

      // Get created notes
      const createdNoteIds = await getCreatedNotes(
        notesContractAddress,
        address,
        provider
      );
      const createdNotesData = await Promise.all(
        createdNoteIds.map(async (id) => {
          const details = await getNoteDetails(
            notesContractAddress,
            id,
            provider
          );
          return details;
        })
      );
      setCreatedNotes(createdNotesData);

      // Initialize newPrices with current prices
      const priceMap: Record<number, string> = {};
      createdNotesData.forEach((note) => {
        priceMap[note.id] = note.price;
      });
      setNewPrices(priceMap);

      // Get purchased notes
      const purchasedNoteIds = await getPurchasedNotes(
        notesContractAddress,
        address,
        provider
      );
      const purchasedNotesData = await Promise.all(
        purchasedNoteIds.map(async (id) => {
          const details = await getNoteDetails(
            notesContractAddress,
            id,
            provider
          );
          return details;
        })
      );
      setPurchasedNotes(purchasedNotesData);
    } catch (error) {
      console.error("Error fetching notes:", error);
      toast({
        title: "Error",
        description: "Failed to load your notes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditPrice = (noteId: number) => {
    setEditingPrice((prev) => ({ ...prev, [noteId]: true }));
  };

  const handlePriceChange = (noteId: number, value: string) => {
    setNewPrices((prev) => ({ ...prev, [noteId]: value }));
  };

  const handleSavePrice = async (noteId: number) => {
    try {
      setSaving((prev) => ({ ...prev, [noteId]: true }));

      await updateNotePrice(
        notesContractAddress,
        noteId,
        newPrices[noteId],
        provider
      );

      toast({
        title: "Price updated",
        description: "Your note price has been updated successfully",
      });

      // Update the price in the UI
      setCreatedNotes((prev) =>
        prev.map((note) =>
          note.id === noteId ? { ...note, price: newPrices[noteId] } : note
        )
      );

      // Exit edit mode
      setEditingPrice((prev) => ({ ...prev, [noteId]: false }));
    } catch (error) {
      console.error("Error updating price:", error);
      toast({
        title: "Update failed",
        description: "There was an error updating the price. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving((prev) => ({ ...prev, [noteId]: false }));
    }
  };

  const handleViewNote = (note: NoteDetails) => {
    // Open the PDF in a new tab using IPFS gateway
    window.open(`https://ipfs.io/ipfs/${note.ipfsHash}`, "_blank");
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const renderCreatedNotes = () => {
    if (createdNotes.length === 0) {
      return (
        <div className="text-center py-12 bg-gray-900/50 backdrop-blur-sm rounded-lg border border-dashed border-gray-700">
          <FileText className="h-12 w-12 mx-auto text-gray-500 mb-2" />
          <h3 className="mt-4 text-lg font-medium text-indigo-300">
            No notes created
          </h3>
          <p className="mt-2 text-sm text-gray-400">
            You haven't created any notes yet.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {createdNotes.map((note) => (
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
                  variant={note.isApproved ? "default" : "secondary"}
                  className={
                    note.isApproved
                      ? "bg-green-900/50 text-green-300 border border-green-700/50"
                      : "bg-amber-900/50 text-amber-300 border border-amber-600/50"
                  }
                >
                  {note.isApproved ? "Approved" : "Pending"}
                </Badge>
              </div>
              <CardDescription className="text-gray-400">
                {note.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="pb-2 pt-4">
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-gray-400">
                    <Tag className="h-4 w-4 mr-1 text-indigo-400" />
                    <span>Price:</span>
                  </div>

                  {editingPrice[note.id] ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={newPrices[note.id]}
                        onChange={(e) =>
                          handlePriceChange(note.id, e.target.value)
                        }
                        className="w-20 h-8 text-sm bg-gray-800 border-gray-700 text-white"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSavePrice(note.id)}
                        disabled={saving[note.id]}
                        className="text-indigo-300 hover:text-indigo-200 hover:bg-gray-800"
                      >
                        {saving[note.id] ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Save className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-indigo-300">{note.price} EDU</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditPrice(note.id)}
                        className="text-indigo-300 hover:text-indigo-200 hover:bg-gray-800"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex items-center text-gray-400">
                  <Calendar className="h-4 w-4 mr-1 text-indigo-400" />
                  <span>Created: {formatDate(note.createdAt)}</span>
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
              <Button
                className="w-full border-indigo-700 bg-indigo-900/30 text-indigo-300 hover:bg-indigo-800/50"
                variant="outline"
                onClick={() => handleViewNote(note)}
              >
                <Download className="mr-2 h-4 w-4" /> View Notes
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  };

  const renderPurchasedNotes = () => {
    if (purchasedNotes.length === 0) {
      return (
        <div className="text-center py-12 bg-gray-900/50 backdrop-blur-sm rounded-lg border border-dashed border-gray-700">
          <FileText className="h-12 w-12 mx-auto text-gray-500 mb-2" />
          <h3 className="mt-4 text-lg font-medium text-indigo-300">
            No purchased notes
          </h3>
          <p className="mt-2 text-sm text-gray-400">
            You haven't purchased any notes yet.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {purchasedNotes.map((note) => (
          <Card
            key={note.id}
            className="overflow-hidden bg-gray-900/70 backdrop-blur-sm border border-gray-700 shadow-md hover:shadow-indigo-500/5 transition-shadow"
          >
            <CardHeader className="pb-2 bg-gray-800/50 border-b border-gray-700">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg text-indigo-300">
                  {note.title}
                </CardTitle>
                <Badge className="bg-purple-900/50 text-purple-300 border border-purple-700/50">
                  Purchased
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
                  <span>
                    Creator: {note.creator.slice(0, 6)}...
                    {note.creator.slice(-4)}
                  </span>
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
                  <span>Price: {note.price} EDU</span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-4 border-t border-gray-700/50">
              <Button
                className="w-full border-indigo-700 bg-indigo-900/30 text-indigo-300 hover:bg-indigo-800/50"
                variant="outline"
                onClick={() => handleViewNote(note)}
              >
                <Download className="mr-2 h-4 w-4" /> View Notes
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12 text-gray-300">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        <span className="ml-2">Loading your notes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 bg-gray-800/70 border border-gray-700">
          <TabsTrigger
            value="created"
            className="data-[state=active]:bg-indigo-900/50 data-[state=active]:text-indigo-300 text-gray-300"
          >
            Created Notes
          </TabsTrigger>
          <TabsTrigger
            value="purchased"
            className="data-[state=active]:bg-indigo-900/50 data-[state=active]:text-indigo-300 text-gray-300"
          >
            Purchased Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="created" className="mt-6">
          <h2 className="text-xl font-semibold mb-4 text-indigo-300">
            Notes You've Created
          </h2>
          {renderCreatedNotes()}
        </TabsContent>

        <TabsContent value="purchased" className="mt-6">
          <h2 className="text-xl font-semibold mb-4 text-indigo-300">
            Notes You've Purchased
          </h2>
          {renderPurchasedNotes()}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default MyNotes;
