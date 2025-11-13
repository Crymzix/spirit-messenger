import { useRef, useState } from "react";
import { TitleBar } from "./title-bar";
import { useUser } from "@/lib";

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

export function ProfilePictureUpload() {
    const user = useUser()
    const [selectedPicture, setSelectedPicture] = useState(user?.displayPictureUrl || DEFAULT_PICTURES[0].url);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setUploadError('Please select an image file (JPEG or PNG)');
            return;
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (file.size > maxSize) {
            setUploadError('Image size must be less than 5MB');
            return;
        }

        setIsUploading(true);
        setUploadError(null);

        try {
            // TODO: Upload to Backend Service API (will be implemented in task 8.2)
            // For now, create a local preview URL
            const previewUrl = URL.createObjectURL(file);
            setSelectedPicture(previewUrl);
            //onUploadComplete(previewUrl);

            console.log('File selected for upload:', file.name, file.size, file.type);
        } catch (error) {
            setUploadError(error instanceof Error ? error.message : 'Failed to upload image');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDefaultPictureSelect = (pictureUrl: string) => {
        setSelectedPicture(pictureUrl);
        //onUploadComplete(pictureUrl);
    };

    const handleBrowseClick = () => {
        fileInputRef.current?.click();
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
                                    {DEFAULT_PICTURES.map((picture, index) => (
                                        <div
                                            key={index}
                                            onClick={() => handleDefaultPictureSelect(picture.url)}
                                            className={`flex items-center gap-1 w-full h-full hover:border-msn-blue ${selectedPicture === picture.url ? 'bg-[#2455B6] text-white' : ''
                                                }`}
                                        >
                                            <div className="relative size-18">
                                                <img
                                                    src={picture.url}
                                                    alt={picture.name}
                                                    className="size-18 object-cover"
                                                />
                                                {selectedPicture === picture.url && (
                                                    <div className="absolute inset-0 bg-[#2455B6] mix-blend-multiply opacity-40" />
                                                )}
                                            </div>
                                            <div>
                                                {picture.name}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 flex-1">
                            <button
                                onClick={handleBrowseClick}
                                disabled={isUploading}
                                className="self-start"
                            >
                                {isUploading ? 'Uploading...' : 'Browse...'}
                            </button>

                            <button
                                disabled={isUploading}
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
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button>
                            OK
                        </button>
                        <button>
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

                    {/* Upload Error */}
                    {uploadError && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-2 py-1.5 rounded text-sm">
                            {uploadError}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}