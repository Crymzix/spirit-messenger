import { useRef, useState } from "react";
import { TitleBar } from "../title-bar";
import { useUser, useUploadDisplayPicture, useProfilePictures, useSetDisplayPicture, useRemoveDisplayPicture } from "@/lib";
import { getCurrentWindow } from "@tauri-apps/api/window";

const DEFAULT_PICTURES = [
    { url: '/default-profile-pictures/friendly_dog.png', name: 'Friendly Dog' },
    { url: '/default-profile-pictures/beach_chairs.png', name: 'Beach Chairs' },
    { url: '/default-profile-pictures/chess_pieces.png', name: 'Chess Pieces' },
    { url: '/default-profile-pictures/dirt_bike.png', name: 'Dirt Bike' },
    { url: '/default-profile-pictures/orange_daisy.png', name: 'Orange Daisy' },
    { url: '/default-profile-pictures/palm_trees.png', name: 'Palm Trees' },
    { url: '/default-profile-pictures/rocket_launch.png', name: 'Rocket Launch' },
    { url: '/default-profile-pictures/rubber_ducky.png', name: 'Rubber Ducky' },
    { url: '/default-profile-pictures/running_horses.png', name: 'Running Horses' },
    { url: '/default-profile-pictures/skateboarder.png', name: 'Skateboarder' },
    { url: '/default-profile-pictures/soccer_ball.png', name: 'Soccer Ball' },
];

export function ProfilePictureUploadWindow() {
    const user = useUser();
    const uploadDisplayPictureMutation = useUploadDisplayPicture();
    const setDisplayPictureMutation = useSetDisplayPicture();
    const removeDisplayPictureMutation = useRemoveDisplayPicture();
    const { data: uploadedPictures = [], isLoading: isLoadingPictures } = useProfilePictures();

    const [selectedPicture, setSelectedPicture] = useState(user?.displayPictureUrl || DEFAULT_PICTURES[0].url);
    const [previewFile, setPreviewFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isProcessing = uploadDisplayPictureMutation.isPending || setDisplayPictureMutation.isPending || removeDisplayPictureMutation.isPending;

    // Combine default pictures with uploaded pictures
    const allPictures = [
        ...DEFAULT_PICTURES.map(p => ({ ...p, type: 'default' as const })),
        ...uploadedPictures.map(p => ({ url: p.pictureUrl, name: p.fileName, type: 'uploaded' as const, id: p.id }))
    ];

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            return;
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (file.size > maxSize) {
            return;
        }

        // Create a local preview URL
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
        setPreviewFile(file);
        setSelectedPicture(objectUrl);

        // Clear the file input value so the same file can be selected again
        event.target.value = '';
    };

    const handlePictureSelect = (pictureUrl: string) => {
        // Clear any preview file when selecting from the list
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
            setPreviewFile(null);
        }
        setSelectedPicture(pictureUrl);
    };

    const handleBrowseClick = () => {
        fileInputRef.current?.click();
    };

    const handleRemoveClick = () => {
        const appWindow = getCurrentWindow();

        removeDisplayPictureMutation.mutate(undefined, {
            onSuccess: () => {
                // Clean up preview if it exists
                if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                    setPreviewFile(null);
                }
                // Close the window
                appWindow.close();
            },
        });
    };

    const handleOk = async () => {
        const appWindow = getCurrentWindow();

        // If there's a preview file, upload it first
        if (previewFile) {
            uploadDisplayPictureMutation.mutate(previewFile, {
                onSuccess: () => {
                    // Clean up preview URL
                    if (previewUrl) {
                        URL.revokeObjectURL(previewUrl);
                    }
                    // Close the window
                    appWindow.close();
                },
            });
        } else if (selectedPicture && selectedPicture !== user?.displayPictureUrl) {
            // Update user's selected profile picture from the list
            setDisplayPictureMutation.mutate(selectedPicture, {
                onSuccess: () => {
                    appWindow.close();
                },
            });
        } else {
            // No changes, just close the window
            await appWindow.close();
        }
    };

    const handleCloseClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        // Clean up preview URL if it exists
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        const appWindow = getCurrentWindow();
        await appWindow.close();
    };

    return (
        <div className="window w-full h-screen flex flex-col">
            <TitleBar title="My Display Picture" />
            <div className="window-body flex-1 overflow-auto !my-[0px] !mx-[3px]">
                <div className="space-y-4 p-6">
                    <p>
                        Select a picture to represent you that others will see in instant message conversations:
                    </p>
                    <div className="flex gap-6 w-full h-[225px]">
                        <div className="w-1/2 border border-gray-400 bg-white overflow-hidden">
                            <div className="border-b w-full border-[#BCBABA] border-b-[2px] text-gray-800 bg-[#ece9d8] px-4 py-1">
                                Display Picture
                            </div>
                            <div className="max-h-[200px] w-full overflow-y-scroll">
                                <div className="space-y-[1px]">
                                    {isLoadingPictures ? (
                                        <div className="p-4 text-center text-gray-500">Loading...</div>
                                    ) : (
                                        allPictures.map((picture, index) => (
                                            <div
                                                key={picture.type === 'uploaded' ? picture.id : index}
                                                onClick={() => handlePictureSelect(picture.url)}
                                                className={`flex items-center gap-1 w-full h-full hover:border-msn-blue cursor-pointer ${selectedPicture === picture.url ? 'bg-[#285CC1] text-white' : ''
                                                    }`}
                                            >
                                                <div className="relative size-18 flex-shrink-0">
                                                    <img
                                                        src={picture.url}
                                                        alt={picture.name}
                                                        className="size-18 object-cover"
                                                    />
                                                    {selectedPicture === picture.url && (
                                                        <div className="absolute inset-0 bg-[#285CC1] mix-blend-multiply opacity-40" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 truncate">
                                                    {picture.name}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 flex-1">
                            <button
                                onClick={handleBrowseClick}
                                disabled={isProcessing}
                                className="self-start"
                            >
                                Browse...
                            </button>

                            <button
                                onClick={handleRemoveClick}
                                disabled={isProcessing || !user?.displayPictureUrl}
                                className="self-start"
                            >
                                Remove
                            </button>

                            {/* Current Display Picture */}
                            <div className="space-y-4">
                                <div className="mt-4">Preview</div>
                                <div
                                    style={{
                                        border: '1px solid #7f9db9',
                                        boxShadow:
                                            'inset 1px 1px 0 #000, ' +
                                            'inset 2px 2px 0 #808080, ' +
                                            'inset -1px -1px 0 #fff, ' +
                                            'inset -2px -2px 0 #dfdfdf'
                                    }}
                                    className="size-48 overflow-hidden px-[2px] py-[1px]"
                                >
                                    <img
                                        src={selectedPicture}
                                        alt="Display picture"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleOk}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (previewFile ? 'Uploading...' : 'Saving...') : 'OK'}
                        </button>
                        <button
                            onClick={handleCloseClick}
                            disabled={isProcessing}
                        >
                            Cancel
                        </button>
                    </div>

                    {/* Hidden File Input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/jpg"
                        onChange={handleFileSelect}
                        className="hidden"
                    />

                    {/* Upload/Save/Remove Error */}
                    {(uploadDisplayPictureMutation.isError || setDisplayPictureMutation.isError || removeDisplayPictureMutation.isError) && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-2 py-1.5 rounded text-sm">
                            {uploadDisplayPictureMutation.isError && uploadDisplayPictureMutation.error instanceof Error
                                ? uploadDisplayPictureMutation.error.message
                                : setDisplayPictureMutation.isError && setDisplayPictureMutation.error instanceof Error
                                    ? setDisplayPictureMutation.error.message
                                    : removeDisplayPictureMutation.isError && removeDisplayPictureMutation.error instanceof Error
                                        ? removeDisplayPictureMutation.error.message
                                        : 'Failed to update profile picture'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}